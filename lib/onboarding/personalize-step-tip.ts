/** Why / help lines for Step 2 product tips (affiliate + soft). */

type TipCtx = {
  locale: string;
  phase?: string;
  severity?: string;
  regions?: string[];
  concerns?: string[];
  productLabel?: string;
  /** Catalog product id when known (for ingredient/fit notes). */
  productId?: string;
  /** morning | evening — shapes why/help copy */
  period?: "morning" | "evening";
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

function skinOpener(ctx: TipCtx, en: boolean): string {
  const concern = concernBit(ctx.concerns, en);
  if (concern) {
    return en ? `For skin with ${concern}` : `Với da đang ${concern}`;
  }
  return en ? "For your skin right now" : "Với da hiện tại của bạn";
}

/** Known catalog fit notes (ingredients / why this SKU). */
function catalogFitNote(productId: string | undefined, en: boolean): string {
  const id = String(productId || "").toLowerCase();
  const notes: Record<string, { en: string; vi: string }> = {
    "cerave-foaming-cleanser": {
      en: "Has ceramides to cleanse without stripping the barrier.",
      vi: "Có ceramides: sạch nhẹ, ít làm mỏng hàng rào da.",
    },
    "cerave-hydrating-cleanser": {
      en: "Creamy cleanse with ceramides — gentler when skin feels tight.",
      vi: "Dạng kem + ceramides — dịu hơn khi da dễ khô căng.",
    },
    "lrp-cicaplast-b5": {
      en: "Panthenol + madecassoside help calm red, irritated spots.",
      vi: "Panthenol + madecassoside: dịu đỏ, hỗ trợ chỗ đang kích ứng.",
    },
    "neutrogena-hydro-boost": {
      en: "Light hyaluronic gel — comfort without a heavy feel.",
      vi: "Gel HA nhẹ: cấp ẩm, ít bí da.",
    },
    "biore-uv-aqua-rich": {
      en: "Light SPF50 gel — daily protection that suits oilier/combo skin.",
      vi: "SPF50 dạng gel mỏng: chống nắng mỗi ngày, hợp da dầu/hỗn hợp.",
    },
    "boj-relief-sun": {
      en: "Gentle mineral-leaning SPF with rice extract — kinder if skin is reactive.",
      vi: "SPF dịu (hướng khoáng) + chiết xuất gạo — dễ chịu hơn nếu da hay nhạy.",
    },
  };
  const hit = notes[id];
  if (!hit) return "";
  return en ? hit.en : hit.vi;
}

function roleFitFallback(
  step: string,
  en: boolean,
  calm: boolean,
  period?: "morning" | "evening",
): string {
  const evening = period === "evening";
  switch (String(step).toLowerCase()) {
    case "cleanse":
      if (evening) {
        return en
          ? "Gently wash off leftover sunscreen and the day’s dirt — don’t leave skin tight."
          : "Rửa nhẹ để gỡ kem chống nắng và bụi trong ngày — đừng để da khô căng.";
      }
      return en
        ? "Pick a gentle cleanser — no scrubbing on swollen spots."
        : "Chọn sữa rửa dịu — không chà lên chỗ đang sưng.";
    case "moisturize":
    case "soothe":
      if (evening) {
        return calm
          ? en
            ? "Overnight repair cream — this week skip strong acne actives."
            : "Kem phục hồi qua đêm — tuần này chưa thêm sản phẩm trị mụn mạnh."
          : en
            ? "Night moisturizer keeps comfort while skin recovers."
            : "Kem dưỡng tối giữ da êm trong lúc da nghỉ.";
      }
      return calm
        ? en
          ? "Repair-style cream calms redness before strong acne treatments."
          : "Kem phục hồi giúp dịu đỏ trước khi dùng trị mụn mạnh."
        : en
          ? "Moisturizer keeps comfort around any single treatment."
          : "Kem dưỡng giữ da êm quanh bước trị (nếu có).";
    case "spf":
      return en
        ? "Daily gentle SPF limits new dark marks (window light counts too)."
        : "SPF dịu mỗi sáng hạn chế thâm mới (cả nắng cửa sổ).";
    case "treat":
      return en
        ? "At most one mild treatment product per night."
        : "Tối đa một sản phẩm trị nhẹ mỗi đêm.";
    default:
      return en
        ? "Supports this care step for your skin now."
        : "Hỗ trợ bước chăm sóc theo da hiện tại.";
  }
}

/**
 * Why this product/role fits the user’s skin (1–2 short sentences).
 */
export function buildPersonalizedStepWhy(
  step: string,
  ctx: TipCtx,
): string {
  const en = isEn(ctx.locale);
  const opener = skinOpener(ctx, en);
  const calm =
    String(ctx.phase || "").toLowerCase() === "calm_first" ||
    String(ctx.phase || "").toLowerCase() === "manual";
  const fit =
    catalogFitNote(ctx.productId, en) ||
    roleFitFallback(step, en, calm, ctx.period);
  return `${opener}: ${fit}`;
}

/**
 * What it helps with (benefit) — keep short and concrete.
 */
export function buildPersonalizedStepHelp(
  step: string,
  ctx: TipCtx,
): string {
  const en = isEn(ctx.locale);
  const calm =
    String(ctx.phase || "").toLowerCase() === "calm_first" ||
    String(ctx.phase || "").toLowerCase() === "manual";
  const evening = ctx.period === "evening";
  switch (String(step).toLowerCase()) {
    case "cleanse":
      return evening
        ? en
          ? "Helps: clear leftover SPF and day dirt without stripping overnight."
          : "Giúp ích: gỡ SPF/bụi còn sót, da không khô căng trước khi ngủ."
        : en
          ? "Helps: remove oil/dirt gently so spots don’t get angrier."
          : "Giúp ích: sạch dầu/bụi nhẹ, ít làm chỗ sưng càng đỏ.";
    case "moisturize":
    case "soothe":
      if (evening) {
        return calm
          ? en
            ? "Helps: soothe overnight and keep the barrier calm this week."
            : "Giúp ích: dịu da qua đêm và giữ hàng rào ổn định tuần này."
          : en
            ? "Helps: overnight comfort while skin recovers."
            : "Giúp ích: giữ da êm qua đêm trong lúc phục hồi.";
      }
      return calm
        ? en
          ? "Helps: calm redness and reduce tight, dry feel overnight/day."
          : "Giúp ích: dịu đỏ và giảm khô căng trong ngày/qua đêm."
        : en
          ? "Helps: keep the barrier comfortable around treatment."
          : "Giúp ích: giữ hàng rào da êm quanh bước trị.";
    case "spf":
      return en
        ? "Helps: daily UV protection and fewer new post-acne dark marks."
        : "Giúp ích: chống nắng mỗi ngày và hạn chế thâm mới sau mụn.";
    case "treat":
      return en
        ? "Helps: clear congestion slowly — one change at a time."
        : "Giúp ích: giảm tắc nghẽn dần — chỉ đổi một thứ một lúc.";
    default:
      return en
        ? "Helps: support this step without overloading skin."
        : "Giúp ích: hỗ trợ bước này mà không chất thêm da.";
  }
}
