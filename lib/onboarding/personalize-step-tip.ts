/** Short why lines for Step 2 affiliate product tips (one line only). */

type TipCtx = {
  locale: string;
  phase?: string;
  severity?: string;
  regions?: string[];
  concerns?: string[];
  productLabel?: string;
};

function isEn(locale: string) {
  return locale.toLowerCase().startsWith("en");
}

function concernBit(concerns: string[] | undefined, en: boolean): string {
  if (!concerns?.length) return "";
  const map: Record<string, { en: string; vi: string }> = {
    acne: { en: "breakouts", vi: "mụn" },
    redness: { en: "redness", vi: "đỏ" },
    irritated: { en: "irritation", vi: "dễ kích ứng" },
    dryness: { en: "dryness", vi: "khô" },
    weak_barrier: { en: "easily irritated skin", vi: "da dễ đỏ" },
    dehydration: { en: "dehydrated feel", vi: "thiếu ẩm" },
    hyperpigmentation: { en: "dark marks", vi: "thâm" },
  };
  const labels = concerns.slice(0, 2).map((c) => {
    const hit = map[String(c).toLowerCase()];
    return hit ? (en ? hit.en : hit.vi) : c;
  });
  if (!labels.length) return "";
  return en
    ? labels.length === 1
      ? labels[0]
      : `${labels[0]} and ${labels[1]}`
    : labels.length === 1
      ? labels[0]
      : `${labels[0]} và ${labels[1]}`;
}

/** One short why line (skin context, no repeating the product name). */
export function buildPersonalizedStepWhy(
  step: string,
  ctx: TipCtx,
): string {
  const en = isEn(ctx.locale);
  const concern = concernBit(ctx.concerns, en);
  const calm =
    String(ctx.phase || "").toLowerCase() === "calm_first" ||
    String(ctx.phase || "").toLowerCase() === "manual";
  const skin = concern
    ? en
      ? `Fits skin with ${concern}`
      : `Phù hợp da đang ${concern}`
    : en
      ? "Fits your skin right now"
      : "Phù hợp da hiện tại";

  switch (String(step).toLowerCase()) {
    case "cleanse":
      return en
        ? `${skin}: cleans gently — don’t scrub swollen spots.`
        : `${skin}: rửa sạch nhẹ — đừng chà chỗ đang sưng.`;
    case "moisturize":
    case "soothe":
      if (calm) {
        return en
          ? `${skin}: calms redness — strong acne treatments can wait.`
          : `${skin}: dịu đỏ / giữ êm — tuần này chưa cần trị mụn mạnh.`;
      }
      return en
        ? `${skin}: keeps comfort around any single treatment step.`
        : `${skin}: giữ da êm nếu có một bước trị.`;
    case "spf":
      return en
        ? `${skin}: daily SPF limits new dark marks (window light counts too).`
        : `${skin}: SPF mỗi sáng hạn chế thâm mới (cả nắng cửa sổ).`;
    case "treat":
      return en
        ? `${skin}: at most one treatment product per night.`
        : `${skin}: tối đa một sản phẩm trị mỗi đêm.`;
    default:
      return en
        ? `${skin}: supports this care step.`
        : `${skin}: hỗ trợ bước chăm sóc này.`;
  }
}
