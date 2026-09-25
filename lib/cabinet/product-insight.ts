/** Locked card from POST /api/v1/wardrobe/products/:id/insight and GET /api/v1/wardrobe. */
export type WardrobeInsightFitVerdict = "yes" | "maybe" | "no";
export type WardrobeInsightBuyAdvice = "nên mua" | "chưa nên";

/**
 * How to talk about a product that is already in the cabinet.
 * The API `buy.advice` field is a purchase verdict ("nên mua" / "chưa nên").
 */
export type OwnedInsightUse = "keep" | "pause";

export type WardrobeInsightActive = {
  name: string;
  gloss: string;
};

export type WardrobeProductInsight = {
  what_it_does: string;
  fit: { verdict: WardrobeInsightFitVerdict; reason: string };
  buy: { advice: WardrobeInsightBuyAdvice; why: string };
  actives?: WardrobeInsightActive[];
  disclaimer: string;
};

/** Server-set line. Shown when a stored card omits `disclaimer`. */
export const WARDROBE_INSIGHT_DISCLAIMER = "không thay bác sĩ da liễu";

const MAX_ACTIVES = 5;

/**
 * Cabinet rows are products the user already owns. Never surface the raw
 * purchase verdict — map it to keep-using vs pause instead.
 */
export function ownedInsightUse(advice: WardrobeInsightBuyAdvice): OwnedInsightUse {
  return advice === "nên mua" ? "keep" : "pause";
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function asText(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function readActives(raw: unknown): { name: string; gloss: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { name: string; gloss: string }[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const row = asRecord(item);
    if (!row) continue;
    const name = asText(row.name);
    const gloss = asText(row.gloss);
    if (!name || !gloss) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ name, gloss });
    if (out.length === MAX_ACTIVES) break;
  }
  return out;
}

/**
 * Read `WardrobeProduct.insight` from GET /api/v1/wardrobe.
 * Returns null unless the locked fields are present. Does not coerce the
 * retired client shape (`fit_for_you`, `buy`/`wait`, `{label, plain}`).
 */
export function parseWardrobeProductInsight(raw: unknown): WardrobeProductInsight | null {
  const row = asRecord(raw);
  if (!row) return null;

  const what_it_does = asText(row.what_it_does);
  const fit = asRecord(row.fit);
  const buy = asRecord(row.buy);
  const reason = asText(fit?.reason);
  const why = asText(buy?.why);
  const verdict = fit?.verdict;
  const advice = buy?.advice;
  if (!what_it_does || !reason || !why) return null;
  if (verdict !== "yes" && verdict !== "maybe" && verdict !== "no") return null;
  if (advice !== "nên mua" && advice !== "chưa nên") return null;

  const actives = readActives(row.actives);
  const disclaimer = asText(row.disclaimer) || WARDROBE_INSIGHT_DISCLAIMER;
  const card: WardrobeProductInsight = {
    what_it_does,
    fit: { verdict, reason },
    buy: { advice, why },
    disclaimer,
  };
  if (actives.length > 0) card.actives = actives;
  return card;
}
