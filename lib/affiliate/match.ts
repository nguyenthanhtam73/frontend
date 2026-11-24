import { affiliateCatalog } from "./catalog";
import type {
  AffiliateCatalog,
  AffiliateFitTag,
  AffiliateMatchInput,
  AffiliateProduct,
  AffiliateStep,
  AffiliateSuggestion,
} from "./types";
import { whyLine } from "./why-copy";

const STEP_RANK: Record<AffiliateStep, number> = {
  sunscreen: 0,
  cleanser: 1,
  moisturizer: 2,
  serum: 3,
  makeup_remover: 4,
  support: 5,
};

const MAX_ITEMS = 3;

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function isDiscounted(
  item: Pick<AffiliateProduct, "priceVnd" | "originalPriceVnd">,
): boolean {
  return item.originalPriceVnd != null && item.originalPriceVnd > item.priceVnd;
}

function tagMatches(tag: AffiliateFitTag, input: AffiliateMatchInput): boolean {
  const types = input.skinTypes;
  const concerns = input.concerns;
  const combo = types.includes("combination");
  switch (tag) {
    case "oily":
      return types.includes("oily") || combo || concerns.includes("oil");
    case "dry":
      return types.includes("dry") || combo || concerns.includes("dryness");
    case "normal":
      return types.includes("normal") || combo;
    case "acne":
      return concerns.includes("acne");
    case "pores":
      return concerns.includes("pores");
    case "dark_spots":
      return concerns.includes("dark_spots");
    case "barrier":
      return concerns.includes("barrier");
    case "hydration":
      return concerns.includes("hydration") || concerns.includes("dryness") || types.includes("dry");
    case "sensitive":
      return types.includes("sensitive") || concerns.includes("redness");
    case "budget":
      return true;
    default:
      return false;
  }
}

type FitClass = {
  kind: "match" | "general" | "mismatch";
  score: number;
  matched: AffiliateFitTag[];
};

function classify(item: AffiliateProduct, input: AffiliateMatchInput): FitClass {
  const specific = item.fit.filter((tag) => tag !== "budget");
  if (specific.length === 0) return { kind: "general", score: 0, matched: [] };
  const matched = specific.filter((tag) => tagMatches(tag, input));
  if (matched.length === 0) return { kind: "mismatch", score: 0, matched: [] };
  return { kind: "match", score: matched.length, matched };
}

function tieBreak(input: AffiliateMatchInput, item: AffiliateProduct): number {
  return hashString(`${input.userId}|${input.dayKey}|${item.affLink}`);
}

function pickInStep(
  items: AffiliateProduct[],
  input: AffiliateMatchInput,
): { item: AffiliateProduct; fit: FitClass } | null {
  const usable = items
    .map((item) => ({ item, fit: classify(item, input) }))
    .filter((row) => row.fit.kind !== "mismatch");
  if (usable.length === 0) return null;
  usable.sort((a, b) => {
    const kindRank = a.fit.kind === "match" ? 0 : 1;
    const otherRank = b.fit.kind === "match" ? 0 : 1;
    if (kindRank !== otherRank) return kindRank - otherRank;
    if (a.fit.score !== b.fit.score) return b.fit.score - a.fit.score;
    const discount = Number(isDiscounted(b.item)) - Number(isDiscounted(a.item));
    if (discount !== 0) return discount;
    return tieBreak(input, a.item) - tieBreak(input, b.item);
  });
  return usable[0]!;
}

/**
 * 1–3 picks, stable for the same user and Vietnam calendar day.
 * Sunscreen comes first when the shelf does not already have it.
 * A step the cabinet already covers is skipped.
 * A severe case returns nothing.
 */
export function matchAffiliateSuggestions(
  input: AffiliateMatchInput,
  catalog: AffiliateCatalog = affiliateCatalog,
  locale: "vi" | "en" = "vi",
): AffiliateSuggestion[] {
  if (input.severe) return [];

  const owned = new Set(input.ownedSteps);
  const byStep = new Map<AffiliateStep, AffiliateProduct[]>();
  for (const item of catalog.items) {
    const list = byStep.get(item.step);
    if (list) list.push(item);
    else byStep.set(item.step, [item]);
  }

  const ranked: { step: AffiliateStep; item: AffiliateProduct; fit: FitClass; tier: number }[] = [];
  for (const [step, items] of byStep) {
    if (owned.has(step)) continue;
    const picked = pickInStep(items, input);
    if (!picked) continue;
    const tier = step === "sunscreen" ? 0 : picked.fit.kind === "match" ? 1 : 2;
    ranked.push({ step, item: picked.item, fit: picked.fit, tier });
  }

  ranked.sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return STEP_RANK[a.step] - STEP_RANK[b.step];
  });

  return ranked.slice(0, MAX_ITEMS).map(({ item, fit }) => ({
    step: item.step,
    name: item.name,
    shop: item.shop,
    rating: item.rating,
    sold: item.sold,
    priceVnd: item.priceVnd,
    affLink: item.affLink,
    why: whyLine({
      step: item.step,
      fit: item.fit,
      matched: fit.matched,
      cabinetKnown: input.cabinetKnown,
      locale,
    }),
    batch: catalog.batch,
  }));
}
