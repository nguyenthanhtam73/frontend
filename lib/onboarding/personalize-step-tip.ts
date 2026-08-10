/** Build plain, skin-personal why / benefit lines for Step 2 product tips. */

type TipCtx = {
  locale: string;
  phase?: string;
  severity?: string;
  regions?: string[];
  concerns?: string[];
  /** Brand · product or role label for optional mention. */
  productLabel?: string;
};

function isEn(locale: string) {
  return locale.toLowerCase().startsWith("en");
}

function regionBit(regions: string[] | undefined, en: boolean): string {
  if (!regions?.length) return "";
  const map: Record<string, { en: string; vi: string }> = {
    cheeks: { en: "cheeks", vi: "má" },
    t_zone: { en: "T-zone", vi: "vùng chữ T" },
    forehead: { en: "forehead", vi: "trán" },
    chin: { en: "chin", vi: "cằm" },
    nose: { en: "nose", vi: "mũi" },
    jaw: { en: "jaw", vi: "hàm" },
  };
  const labels = regions.slice(0, 2).map((r) => {
    const hit = map[String(r).toLowerCase()];
    return hit ? (en ? hit.en : hit.vi) : String(r).replace(/_/g, " ");
  });
  if (!labels.length) return "";
  return en ? labels.join(" & ") : labels.join(" và ");
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

function skinOpener(ctx: TipCtx, en: boolean): string {
  const region = regionBit(ctx.regions, en);
  const concern = concernBit(ctx.concerns, en);
  const dense = String(ctx.severity || "").toLowerCase() === "dense";
  if (en) {
    const bits = [
      region && `on your ${region}`,
      dense && "with dense inflammation",
      concern && `dealing with ${concern}`,
    ].filter(Boolean);
    if (!bits.length) return "For your skin right now";
    return `For skin ${bits.join(", ")}`;
  }
  const bits = [
    region && `vùng ${region}`,
    dense && "mụn viêm dày",
    concern && `đang ${concern}`,
  ].filter(Boolean);
  if (!bits.length) return "Với da hiện tại của bạn";
  return `Với ${bits.join(", ")}`;
}

/** One why line: why THIS role/product fits the user’s skin. */
export function buildPersonalizedStepWhy(
  step: string,
  ctx: TipCtx,
): string {
  const en = isEn(ctx.locale);
  const opener = skinOpener(ctx, en);
  const calm =
    String(ctx.phase || "").toLowerCase() === "calm_first" ||
    String(ctx.phase || "").toLowerCase() === "manual";
  const product = ctx.productLabel?.trim();

  switch (String(step).toLowerCase()) {
    case "cleanse":
      if (en) {
        return product
          ? `${opener}: ${product} cleans gently so you don’t scrub or sting swollen spots.`
          : `${opener}: a gentle cleanser removes dirt/oil without scrubbing inflamed areas.`;
      }
      return product
        ? `${opener}: ${product} giúp rửa sạch nhẹ — không chà thêm chỗ đang sưng hay dễ rát.`
        : `${opener}: sữa rửa dịu giúp sạch bẩn/dầu mà không chà thêm chỗ đang sưng.`;
    case "moisturize":
    case "soothe":
      if (calm) {
        if (en) {
          return product
            ? `${opener}: ${product} calms redness and keeps skin comfortable — strong acne treatments can wait.`
            : `${opener}: a soothing moisturizer eases redness and tightness before any strong treatment.`;
        }
        return product
          ? `${opener}: ${product} giúp dịu đỏ và giữ da êm — tuần này chưa cần sản phẩm trị mụn mạnh.`
          : `${opener}: kem dưỡng làm dịu giúp bớt đỏ/căng trước khi nghĩ tới trị mụn mạnh.`;
      }
      if (en) {
        return product
          ? `${opener}: ${product} keeps skin comfortable around any single treatment step.`
          : `${opener}: moisturizer keeps skin comfortable if you use one treatment product.`;
      }
      return product
        ? `${opener}: ${product} giúp da êm quanh bước trị (nếu có).`
        : `${opener}: kem dưỡng giữ da êm nếu bạn dùng một sản phẩm trị.`;
    case "spf":
      if (en) {
        return product
          ? `${opener}: ${product} every morning protects healing spots and limits new dark marks — sunlight through windows still counts.`
          : `${opener}: a gentle morning sunscreen protects healing spots and limits new dark marks — sunlight through windows still counts.`;
      }
      return product
        ? `${opener}: ${product} mỗi sáng bảo vệ chỗ đang lành và hạn chế thâm mới — ánh sáng qua cửa sổ vẫn đủ để làm thâm.`
        : `${opener}: kem chống nắng dịu mỗi sáng bảo vệ chỗ đang lành và hạn chế thâm mới — ánh sáng qua cửa sổ vẫn đủ để làm thâm.`;
    case "treat":
      if (en) {
        return `${opener}: at most one treatment product at night — never two strong ones together.`;
      }
      return `${opener}: tối đa một sản phẩm trị mỗi đêm — không dùng hai loại mạnh cùng lúc.`;
    default:
      return en
        ? `${opener}: this step supports your current routine.`
        : `${opener}: bước này hỗ trợ routine hiện tại của bạn.`;
  }
}

/** One short benefit line (what it does for you). */
export function buildPersonalizedStepBenefit(
  step: string,
  ctx: TipCtx,
): string {
  const en = isEn(ctx.locale);
  const calm =
    String(ctx.phase || "").toLowerCase() === "calm_first" ||
    String(ctx.phase || "").toLowerCase() === "manual";
  switch (String(step).toLowerCase()) {
    case "cleanse":
      return en
        ? "Helps: clean without making swollen spots angrier."
        : "Giúp ích: sạch nhẹ, ít làm chỗ sưng càng đỏ/rát.";
    case "moisturize":
    case "soothe":
      return calm
        ? en
          ? "Helps: calm redness and reduce tight, dry feel."
          : "Giúp ích: dịu đỏ và giảm cảm giác khô căng."
        : en
          ? "Helps: keep skin comfortable overnight."
          : "Giúp ích: giữ da dễ chịu qua đêm.";
    case "spf":
      return en
        ? "Helps: daily sun protection and fewer new dark marks."
        : "Giúp ích: chống nắng mỗi ngày và hạn chế thâm mới sau mụn.";
    case "treat":
      return en
        ? "Helps: target congestion slowly, one change at a time."
        : "Giúp ích: giảm tắc nghẽn dần, chỉ đổi một thứ một lúc.";
    default:
      return en ? "Helps: support this care step." : "Giúp ích: hỗ trợ bước chăm sóc này.";
  }
}
