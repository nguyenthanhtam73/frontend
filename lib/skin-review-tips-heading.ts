import type { AdminSkinReviewAnalysis } from "@/lib/types/admin-skin-review";

const INFLAMED = new Set([
  "acne",
  "papules",
  "pustules",
  "redness",
  "irritation",
]);

const PIGMENT = new Set(["pigmentation", "dark_spots"]);

/** Pick tips section heading key by dominant visible concern. */
export function skinReviewTipsHeadingKey(
  analysis: AdminSkinReviewAnalysis | null | undefined,
): "fieldSoothingTips" | "fieldSoothingTipsPigment" | "fieldSoothingTipsGeneral" {
  if (!analysis) return "fieldSoothingTipsGeneral";
  let inflamed = false;
  let pigment = false;
  for (const ar of analysis.attention_areas ?? []) {
    const c = (ar.concern ?? "").trim().toLowerCase();
    if (INFLAMED.has(c)) inflamed = true;
    if (PIGMENT.has(c)) pigment = true;
  }
  const blob = `${analysis.overview ?? ""} ${analysis.additional_observations ?? ""}`.toLowerCase();
  if (!pigment && (blob.includes("thâm") || blob.includes("đốm nâu") || blob.includes("pigment"))) {
    pigment = true;
  }
  if (
    !inflamed &&
    (blob.includes("mụn viêm") ||
      blob.includes("đỏ sưng") ||
      blob.includes("đầu trắng") ||
      blob.includes("pustule"))
  ) {
    inflamed = true;
  }
  if (pigment && !inflamed) return "fieldSoothingTipsPigment";
  if (inflamed) return "fieldSoothingTips";
  return "fieldSoothingTipsGeneral";
}
