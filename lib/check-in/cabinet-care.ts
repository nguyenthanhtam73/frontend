import { guessWardrobeCategory } from "@/lib/cabinet/guess-category";
import type { WardrobeCategoryId } from "@/lib/cabinet/categories";
import type { WardrobeProductDTO } from "@/lib/types/wardrobe";

/** Care / guidance step mapped onto a product the user already owns. */
export type CabinetCareMatch = {
  productId: string;
  name: string;
  brand?: string;
  category: WardrobeCategoryId | string;
  reasonStep: string;
};

const ROLE_ALIASES: Record<string, WardrobeCategoryId> = {
  cleanse: "cleanser",
  cleanser: "cleanser",
  moisturize: "moisturizer",
  moisturiser: "moisturizer",
  moisturizecalm: "moisturizer",
  soothe: "moisturizer",
  spf: "spf",
  sunscreen: "spf",
  treat: "treatment",
  treatment: "treatment",
  toner: "toner",
  serum: "serum",
  mask: "mask",
};

function compactKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

/** Map a care step / guidance role to a wardrobe category, or null if unknown. */
export function careRoleFromText(text: string): WardrobeCategoryId | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const alias = ROLE_ALIASES[compactKey(trimmed)];
  if (alias) return alias;
  const guessed = guessWardrobeCategory(trimmed);
  return guessed === "other" ? null : guessed;
}

function productCategory(p: WardrobeProductDTO): WardrobeCategoryId | string {
  const raw = p.category?.trim();
  if (raw) return raw;
  return guessWardrobeCategory(`${p.name} ${p.brand ?? ""}`);
}

function rolesFromCare(steps: { step?: string }[] | undefined): Map<WardrobeCategoryId, string> {
  const out = new Map<WardrobeCategoryId, string>();
  for (const item of steps ?? []) {
    const step = item.step?.trim();
    if (!step) continue;
    const role = careRoleFromText(step);
    if (role && !out.has(role)) out.set(role, step);
  }
  return out;
}

/**
 * Prefer cabinet products that cover today's care / guidance roles.
 * One product per role; first shelf match wins.
 */
export function matchCabinetToCare(opts: {
  products: WardrobeProductDTO[];
  careSteps?: { step?: string }[];
  guidance?: { step?: string; category?: string; name_or_category?: string }[];
}): CabinetCareMatch[] {
  const roles = rolesFromCare(opts.careSteps);
  for (const g of opts.guidance ?? []) {
    const label = g.step || g.category || g.name_or_category || "";
    const role = careRoleFromText(g.step || "") || careRoleFromText(g.category || "") || careRoleFromText(label);
    if (role && !roles.has(role)) roles.set(role, label.trim() || role);
  }
  if (roles.size === 0 || opts.products.length === 0) return [];

  const used = new Set<string>();
  const out: CabinetCareMatch[] = [];
  for (const [role, reasonStep] of roles) {
    const hit = opts.products.find((p) => {
      if (used.has(p.id)) return false;
      return productCategory(p) === role;
    });
    if (!hit) continue;
    used.add(hit.id);
    out.push({
      productId: hit.id,
      name: hit.name,
      brand: hit.brand,
      category: role,
      reasonStep,
    });
  }
  return out;
}

/** Categories already covered by the user's cabinet. */
export function cabinetCoveredRoles(products: WardrobeProductDTO[]): Set<string> {
  const out = new Set<string>();
  for (const p of products) {
    const cat = productCategory(p);
    if (cat && cat !== "other") out.add(String(cat));
  }
  return out;
}

/** True when a buy/affiliate card's role is already on the shelf. */
export function isAffiliateRoleCovered(
  item: { step?: string; category?: string; name_or_category?: string },
  covered: Set<string>,
): boolean {
  const role =
    careRoleFromText(item.step || "") ||
    careRoleFromText(item.category || "") ||
    careRoleFromText(item.name_or_category || "");
  return role != null && covered.has(role);
}
