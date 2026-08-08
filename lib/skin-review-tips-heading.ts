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
  | "fieldSoothingTipsNeck"
  | "fieldSoothingTipsGeneral";

function looksSkinTagProse(s: string): boolean {
  const t = s.toLowerCase();
  if (t.includes("mụn thịt") || t.includes("skin tag") || t.includes("skin-tag")) {
    return true;
  }
  const tone =
    t.includes("màu da") ||
    t.includes("nâu nhạt") ||
    t.includes("skin-colored") ||
    t.includes("skin coloured");
  const raised = t.includes("nổi cao") || t.includes("raised");
  return tone && raised;
}

function looksNeckCreaseProse(s: string): boolean {
  const t = s.toLowerCase();
  const crease =
    t.includes("nếp gấp") ||
    t.includes("nếp ngang") ||
    t.includes("nếp cổ") ||
    t.includes("tech neck") ||
    t.includes("neck crease") ||
    t.includes("horizontal crease") ||
    t.includes("horizontal line");
  const neck = t.includes("cổ") || t.includes("neck");
  return crease && neck;
}

function looksAcuteRed(s: string): boolean {
  const t = s.toLowerCase();
  return (
    t.includes("mụn viêm") ||
    t.includes("đỏ sưng") ||
    t.includes("đầu trắng") ||
    t.includes("pustule") ||
    t.includes("có mủ") ||
    t.includes("viêm cấp sát mép") ||
    t.includes("chùm hạt đỏ")
  );
}

function looksPigmentProse(s: string): boolean {
  const t = s.toLowerCase();
  return (
    t.includes("thâm") ||
    t.includes("đốm nâu") ||
    t.includes("sắc tố") ||
    t.includes("pigment") ||
    t.includes("nâu–xám") ||
    t.includes("nâu-xám") ||
    t.includes("nâu xám")
  );
}

function questionAsksPeriOralTham(q: string | null | undefined): boolean {
  const ql = (q ?? "").toLowerCase();
  const tham =
    ql.includes("thâm") || ql.includes("pigment") || ql.includes("đốm nâu") || ql.includes("dark mark");
  const mouth =
    ql.includes("mép") ||
    ql.includes("khóe") ||
    ql.includes("miệng") ||
    ql.includes("cằm") ||
    ql.includes("mouth") ||
    ql.includes("lip");
  return tham && mouth;
}

function questionAsksNeckCrease(q: string | null | undefined): boolean {
  const ql = (q ?? "").toLowerCase();
  const neck = ql.includes("cổ") || ql.includes("neck");
  const crease =
    ql.includes("nếp") ||
    ql.includes("nhăn") ||
    ql.includes("crease") ||
    ql.includes("wrinkle") ||
    ql.includes("cải thiện") ||
    ql.includes("tips") ||
    ql.includes("như thế");
  return neck && crease;
}

function questionHasAcuteLipSignals(q: string | null | undefined): boolean {
  const ql = (q ?? "").toLowerCase();
  const mouthMove = ql.includes("mở miệng") || ql.includes("há miệng") || ql.includes("open my mouth");
  const pain = ql.includes("đau") || ql.includes("chằn") || ql.includes("cộm");
  const progress =
    (ql.includes("nhô") || ql.includes("nổi")) &&
    (ql.includes("sáng") || ql.includes("trưa") || ql.includes("giờ") || ql.includes("nhanh"));
  return (mouthMove && pain) || (progress && (pain || mouthMove));
}

function hasStrongAcuteLipCluster(blob: string): boolean {
  const t = blob.toLowerCase();
  const peri = t.includes("mép") || t.includes("khóe") || t.includes("viền môi") || t.includes("lip");
  if (!peri) return false;
  const hasCluster =
    (t.includes("chùm hạt đỏ") || t.includes("chùm hạt đỏ sưng")) &&
    !t.includes("không chùm hạt đỏ") &&
    !t.includes("ko chùm hạt đỏ") &&
    !t.includes("chưa có chùm");
  const hasRedSwell =
    t.includes("đỏ sưng") &&
    (t.includes("chùm") || t.includes("hạt")) &&
    !t.includes("không chùm") &&
    !t.includes("không đỏ sưng");
  const hasBrightHead = t.includes("đầu sáng") && t.includes("sưng");
  return hasCluster || hasRedSwell || hasBrightHead;
}

/** Pick tips section heading key by dominant visible concern (+ optional user question). */
export function skinReviewTipsHeadingKey(
  analysis: AdminSkinReviewAnalysis | null | undefined,
  userQuestion?: string | null,
): SkinReviewTipsHeadingKey {
  if (!analysis) return "fieldSoothingTipsGeneral";

  let inflamedConcern = false;
  let pigment = false;
  let skinTag = false;
  let neckCrease = false;
  let neckRegion = false;

  for (const ar of analysis.attention_areas ?? []) {
    const c = (ar.concern ?? "").trim().toLowerCase();
    const r = (ar.region ?? "").trim().toLowerCase();
    const note = ar.note ?? "";
    if (r === "neck") neckRegion = true;
    if (INFLAMED.has(c)) inflamedConcern = true;
    if (PIGMENT.has(c)) pigment = true;
    if (c === "texture" && (r === "neck" || looksNeckCreaseProse(note))) neckCrease = true;
    if (looksSkinTagProse(note)) skinTag = true;
    if (looksNeckCreaseProse(note)) neckCrease = true;
    if (looksPigmentProse(note)) pigment = true;
  }

  const blob = `${analysis.overview ?? ""} ${analysis.additional_observations ?? ""} ${
    analysis.photo_notes ?? ""
  }`;
  if (looksSkinTagProse(blob)) skinTag = true;
  if (looksNeckCreaseProse(blob)) neckCrease = true;
  if (looksPigmentProse(blob)) pigment = true;
  const inflamedProse = looksAcuteRed(blob);
  const strongAcuteLip = hasStrongAcuteLipCluster(blob);

  // User asks peri-oral thâm without acute timeline, and photo isn't a clear red cluster → pigment label
  // even if analysis still says “viêm cấp sát mép”.
  if (
    questionAsksPeriOralTham(userQuestion) &&
    !questionHasAcuteLipSignals(userQuestion) &&
    !strongAcuteLip
  ) {
    return "fieldSoothingTipsPigment";
  }

  // Skin tags win over bare neck-crease wording when raised bumps are described.
  if (skinTag && !inflamedProse) return "fieldSoothingTipsSkinTag";

  if (
    (neckCrease || (questionAsksNeckCrease(userQuestion) && neckRegion)) &&
    !inflamedProse &&
    !skinTag
  ) {
    return "fieldSoothingTipsNeck";
  }

  if (pigment && !inflamedProse) return "fieldSoothingTipsPigment";
  if (inflamedProse || inflamedConcern) return "fieldSoothingTips";
  return "fieldSoothingTipsGeneral";
}
