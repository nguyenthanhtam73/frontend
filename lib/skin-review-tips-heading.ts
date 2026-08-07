import type { AdminSkinReviewAnalysis } from "@/lib/types/admin-skin-review";

const INFLAMED = new Set([
  "acne",
  "papules",
  "pustules",
  "redness",
  "irritation",
]);

const PIGMENT = new Set(["pigmentation", "dark_spots"]);

export type SkinReviewTipsHeadingKey =
  | "fieldSoothingTips"
  | "fieldSoothingTipsPigment"
  | "fieldSoothingTipsSkinTag"
  | "fieldSoothingTipsGeneral";

function looksSkinTagProse(s: string): boolean {
  const t = s.toLowerCase();
  if (t.includes("mụn thịt") || t.includes("skin tag") || t.includes("skin-tag")) {
    return true;
  }
  // Require both skin-tone cue + raised morphology — not bare "nốt"/"nổi".
  const tone =
    t.includes("màu da") ||
    t.includes("nâu nhạt") ||
    t.includes("skin-colored") ||
    t.includes("skin coloured");
  const raised = t.includes("nổi cao") || t.includes("raised");
  return tone && raised;
}

function looksAcuteRed(s: string): boolean {
  const t = s.toLowerCase();
  return (
    t.includes("mụn viêm") ||
    t.includes("đỏ sưng") ||
    t.includes("đầu trắng") ||
    t.includes("pustule") ||
    t.includes("có mủ")
  );
}

/** Pick tips section heading key by dominant visible concern. */
export function skinReviewTipsHeadingKey(
  analysis: AdminSkinReviewAnalysis | null | undefined,
): SkinReviewTipsHeadingKey {
  if (!analysis) return "fieldSoothingTipsGeneral";

  let inflamedConcern = false;
  let pigment = false;
  let skinTag = false;

  for (const ar of analysis.attention_areas ?? []) {
    const c = (ar.concern ?? "").trim().toLowerCase();
    const note = ar.note ?? "";
    if (INFLAMED.has(c)) inflamedConcern = true;
    if (PIGMENT.has(c)) pigment = true;
    if (looksSkinTagProse(note)) skinTag = true;
  }

  const blob = `${analysis.overview ?? ""} ${analysis.additional_observations ?? ""} ${
    analysis.photo_notes ?? ""
  }`;
  const blobLow = blob.toLowerCase();
  if (looksSkinTagProse(blob)) skinTag = true;
  if (
    !pigment &&
    (blobLow.includes("thâm") || blobLow.includes("đốm nâu") || blobLow.includes("pigment"))
  ) {
    pigment = true;
  }
  const inflamedProse = looksAcuteRed(blob);

  // Skin-tag wins even if concern was mislabeled `irritation`, unless prose is clearly inflamed acne.
  if (skinTag && !inflamedProse) return "fieldSoothingTipsSkinTag";
  if (pigment && !inflamedProse && !inflamedConcern) return "fieldSoothingTipsPigment";
  if (inflamedProse || inflamedConcern) return "fieldSoothingTips";
  if (pigment) return "fieldSoothingTipsPigment";
  return "fieldSoothingTipsGeneral";
}
