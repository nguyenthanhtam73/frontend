export const WARDROBE_CATEGORY_IDS = [
  "cleanser",
  "toner",
  "serum",
  "moisturizer",
  "spf",
  "treatment",
  "mask",
  "other",
] as const;

export type WardrobeCategoryId = (typeof WARDROBE_CATEGORY_IDS)[number];

export function isWardrobeCategoryId(id: string): id is WardrobeCategoryId {
  return (WARDROBE_CATEGORY_IDS as readonly string[]).includes(id);
}
