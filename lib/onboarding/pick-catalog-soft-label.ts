import catalogJson from "@/lib/onboarding/affiliate-catalog.json";

export type AffiliateCatalogEntry = {
  id: string;
  product_name: string;
  brand: string;
  category: string;
  step?: string;
  skin_types: string[];
  concerns: string[];
  phases?: string[];
  affiliate_link?: string;
  price_range?: string;
};

const CATALOG = catalogJson as AffiliateCatalogEntry[];

function norm(s: string | undefined): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function roleMatches(entry: AffiliateCatalogEntry, role: string): boolean {
  const step = norm(entry.step);
  const cat = norm(entry.category);
  switch (norm(role)) {
    case "cleanse":
      return step === "cleanse" || cat === "cleanser";
    case "moisturize":
      return step === "moisturize" || cat === "moisturizer";
    case "soothe":
      return (
        step === "soothe" ||
        step === "moisturize" ||
        cat === "toner" ||
        cat === "serum" ||
        cat === "moisturizer"
      );
    case "spf":
      return step === "spf" || cat === "spf";
    case "treat":
      return step === "treat" || cat === "treatment" || cat === "serum";
    default:
      return false;
  }
}

function phaseOk(entry: AffiliateCatalogEntry, phase: string): boolean {
  const phases = entry.phases ?? [];
  if (!phases.length) return true;
  const p = norm(phase);
  const calm = p === "calm_first" || p === "manual" || p === "";
  if (calm) return phases.some((x) => norm(x) === "calm_first");
  return phases.some((x) => norm(x) === "can_add_active" || norm(x) === p);
}

function scoreEntry(
  entry: AffiliateCatalogEntry,
  concerns: string[] | undefined,
  skinType: string | undefined,
): number {
  let score = 1;
  const skin = norm(skinType);
  const skins = (entry.skin_types ?? []).map(norm);
  if (skin) {
    if (skins.includes(skin)) score += 3;
    if (skin === "combo" && skins.includes("combination")) score += 3;
    if (skin === "combination" && skins.includes("combination")) score += 3;
  }
  const concernSet = new Set((concerns ?? []).map(norm).filter(Boolean));
  for (const c of entry.concerns ?? []) {
    if (concernSet.has(norm(c))) score += 2;
  }
  return score;
}

/** Short mobile-friendly product title (Brand · short name, no brand echo). */
export function formatShortCatalogLabel(entry: {
  brand?: string;
  product_name?: string;
}): string {
  const brand = String(entry.brand ?? "").trim();
  let name = String(entry.product_name ?? "").trim();

  // Drop leading brand.
  if (brand && name.toLowerCase().startsWith(brand.toLowerCase())) {
    name = name.slice(brand.length).trim().replace(/^[-·,/]\s*/, "");
  }
  // Drop brand token anywhere (e.g. "Tinh chất … Biore UV …").
  if (brand) {
    const brandRe = new RegExp(
      `\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "gi",
    );
    name = name.replace(brandRe, " ").replace(/\s{2,}/g, " ").trim();
  }

  name = name.split(/[—(]/)[0]?.trim() || name;
  name = name
    .replace(/\bSPF\s*\d+\+?/gi, "")
    .replace(/\bPA\s*\++/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Prefer a readable product core (drop filler prefixes when long).
  const filler =
    /^(tinh chất|kem chống nắng|kem phục hồi|kem dưỡng ẩm|kem dưỡng|sữa rửa mặt|toner|serum|essence)\s+/i;
  if (name.length > 28 && filler.test(name)) {
    name = name.replace(filler, "").trim();
  }

  const words = name.split(/\s+/).filter(Boolean);
  if (words.length > 5) name = words.slice(0, 5).join(" ");
  if (!name) name = String(entry.product_name ?? "").trim().slice(0, 28);
  if (name) name = name.charAt(0).toLocaleUpperCase("vi") + name.slice(1);

  return [brand, name].filter(Boolean).join(" · ");
}

/**
 * Pick up to 2 catalog entries for a routine role (no CTA required).
 */
export function pickCatalogSoftPicks(
  role: string,
  opts: {
    locale: string;
    phase?: string;
    concerns?: string[];
    skinType?: string;
    excludeIds?: Set<string>;
    prefer?: { id?: string; brand?: string; product_name?: string };
  },
): AffiliateCatalogEntry[] {
  const exclude = opts.excludeIds ?? new Set<string>();
  const phase = opts.phase || "calm_first";

  const candidates = CATALOG.filter(
    (e) => roleMatches(e, role) && phaseOk(e, phase),
  )
    .map((e) => ({ e, score: scoreEntry(e, opts.concerns, opts.skinType) }))
    .sort((a, b) => b.score - a.score || a.e.id.localeCompare(b.e.id));

  const picks: AffiliateCatalogEntry[] = [];
  const seen = new Set<string>();

  const preferId = opts.prefer?.id?.trim();
  if (preferId) {
    const hit = CATALOG.find((e) => e.id === preferId && roleMatches(e, role));
    if (hit) {
      picks.push(hit);
      seen.add(hit.id);
    }
  } else if (opts.prefer?.brand && opts.prefer?.product_name) {
    picks.push({
      id: preferId || `prefer-${role}`,
      brand: opts.prefer.brand,
      product_name: opts.prefer.product_name,
      category: "",
      skin_types: [],
      concerns: [],
    });
    seen.add(picks[0].id);
  }

  for (const { e } of candidates) {
    if (picks.length >= 2) break;
    if (seen.has(e.id)) continue;
    if (exclude.has(e.id) && picks.length > 0) continue;
    picks.push(e);
    seen.add(e.id);
  }

  if (picks.length < 2) {
    for (const { e } of candidates) {
      if (picks.length >= 2) break;
      if (seen.has(e.id)) continue;
      picks.push(e);
      seen.add(e.id);
    }
  }

  return picks.slice(0, 2);
}

/** Labels only — prefer pickCatalogSoftPicks when ids are needed. */
export function pickCatalogSoftLabels(
  role: string,
  opts: Parameters<typeof pickCatalogSoftPicks>[1],
): string[] {
  return pickCatalogSoftPicks(role, opts).map(formatShortCatalogLabel);
}

/** @deprecated use pickCatalogSoftLabels */
export function pickCatalogSoftLabel(
  role: string,
  opts: Parameters<typeof pickCatalogSoftPicks>[1],
): string | null {
  const labels = pickCatalogSoftLabels(role, opts);
  if (!labels.length) return null;
  const en = opts.locale.toLowerCase().startsWith("en");
  return labels.length === 1
    ? labels[0]
    : en
      ? `${labels[0]} · or ${labels[1]}`
      : `${labels[0]} · hoặc ${labels[1]}`;
}
