/** Resolve the concern chip shown on Skin Review so “Nốt đỏ sưng” never
 *  appears when the note says there is no redness. */

function blobOf(note?: string, overview?: string): string {
  return `${note ?? ""} ${overview ?? ""}`.toLowerCase();
}

export function proseDeniesRedSwelling(s: string): boolean {
  const t = s.toLowerCase();
  return (
    t.includes("không thấy đỏ sưng") ||
    t.includes("không đỏ sưng") ||
    t.includes("không thấy đỏ hay mủ") ||
    t.includes("no redness or pus") ||
    t.includes("not red or swollen") ||
    t.includes("no red swelling")
  );
}

export function looksCheekRoughTexture(s: string): boolean {
  const t = s.toLowerCase();
  if (t.includes("sần sùi")) return true;
  if (t.includes("gồ ghề không đều") || t.includes("texture không đều")) return true;
  if (t.includes("uneven texture") || t.includes("rough / uneven")) return true;
  return t.includes("gồ ghề") && (t.includes("không đều") || t.includes("sần"));
}

const INFLAMED_CHIPS = new Set(["papules", "pustules", "redness", "irritation"]);

/** Concern enum to display (may differ from stored analysis.concern). */
export function resolveSkinReviewConcern(
  area: { region?: string; concern?: string; note?: string },
  overview?: string,
): string {
  const c = (area.concern ?? "").trim().toLowerCase();
  const blob = blobOf(area.note, overview);
  const r = (area.region ?? "").trim().toLowerCase();
  const cheek = r === "cheeks" || r === "cheek";
  const deniesRed = proseDeniesRedSwelling(blob);
  const rough = looksCheekRoughTexture(blob);

  if (deniesRed && INFLAMED_CHIPS.has(c)) {
    if (rough || (cheek && rough)) return "texture";
    return "acne";
  }
  if (cheek && rough && (c === "papules" || c === "acne" || c === "other")) {
    return "texture";
  }
  return c;
}

export function skinReviewConcernUsesUnevenTextureLabel(
  resolvedConcern: string,
  area: { region?: string; note?: string },
  overview?: string,
): boolean {
  if (resolvedConcern !== "texture") return false;
  const r = (area.region ?? "").trim().toLowerCase();
  if (r === "neck") return false;
  return looksCheekRoughTexture(blobOf(area.note, overview));
}
