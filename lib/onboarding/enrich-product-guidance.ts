import type { ProductGuidanceItemDTO } from "@/lib/types/product-guidance";

type EnrichCtx = {
  phase?: string;
  severity?: string;
  regions?: string[];
  concerns?: string[];
  locale: string;
};

function isEn(locale: string) {
  return locale.toLowerCase().startsWith("en");
}

/** Strip repeating “Với vùng má…:” / “For cheeks…:” openers — context lives in summary. */
export function stripRepeatedContextPrefix(why: string, en: boolean): string {
  const trimmed = why.trim();
  if (!trimmed) return trimmed;
  const low = trimmed.toLowerCase();
  const prefixes = en ? ["for ", "với "] : ["với ", "for "];
  for (const p of prefixes) {
    if (!low.startsWith(p)) continue;
    const rest = trimmed.slice(p.length);
    for (const sep of [" — ", " – ", " - ", ": ", "—"] as const) {
      const i = rest.indexOf(sep);
      if (i > 0 && i < 80) {
        const after = rest.slice(i + sep.length).trim();
        if (!after) continue;
        if (en) {
          return after.charAt(0).toUpperCase() + after.slice(1);
        }
        return after;
      }
    }
  }
  return trimmed;
}

/** Soften skincare jargon so Step 2 copy stays readable for beginners. */
export function plainifyGuidanceText(text: string, en: boolean): string {
  let out = text.trim();
  if (!out) return out;
  const pairs = en
    ? ([
        ["No BHA/BP push in this phase", "Skip strong acne treatments this week"],
        ["no BHA/retinoid yet", "skip acids or retinol for now"],
        ["no BHA/retinoid", "skip acids or retinol"],
        ["strong actives", "strong treatment products"],
        ["strong active", "strong treatment"],
        ["reactive skin", "sensitive skin"],
        ["inflamed zones", "sore spots"],
        ["barrier repair", "helping skin recover"],
        ["the barrier", "your skin’s comfort"],
        ["support the barrier", "keep skin comfortable"],
        ["Supports barrier", "Helps skin feel stronger"],
        ["Daily SPF", "Morning sunscreen"],
        ["Keep SPF", "Keep sunscreen"],
        ["stack", "use together"],
      ] as const)
    : ([
        ["Pha này không đẩy BHA/BP", "Tuần này chưa dùng sản phẩm trị mụn mạnh"],
        ["không đẩy BHA/BP", "chưa dùng sản phẩm trị mụn mạnh"],
        ["chưa đẩy BHA/retinoid", "chưa dùng acid hay retinol"],
        ["chưa BHA/retinoid", "chưa dùng acid hay retinol"],
        ["tuần này chưa BHA/retinoid", "tuần này chưa dùng acid hay retinol"],
        ["bỏ qua active mạnh", "tạm bỏ sản phẩm trị mạnh"],
        ["active mạnh", "sản phẩm trị mạnh"],
        ["chưa treat mạnh", "chưa cần sản phẩm trị mạnh"],
        ["hỗ trợ phục hồi barrier", "giúp da khỏe lại"],
        ["Hỗ trợ phục hồi barrier", "Giúp da khỏe lại"],
        ["hỗ trợ barrier", "giúp da khỏe lại"],
        ["Hỗ trợ barrier", "Giúp da khỏe lại"],
        ["/ hỗ trợ barrier", ""],
        ["da đang kích", "da đang nhạy"],
        ["đang kích", "đang nhạy"],
        ["châm chích", "rát"],
        ["Ít châm trên", "Ít gây rát trên"],
        ["Ít châm", "Ít gây rát"],
        ["dễ châm", "hay bị rát"],
        ["đang châm", "đang rát"],
        ["Che nắng cho", "Bảo vệ"],
        ["Vẫn cần SPF", "Vẫn cần kem chống nắng"],
        ["SPF mỗi sáng", "Kem chống nắng mỗi sáng"],
        ["Không phải kê đơn", "Đây không phải đơn thuốc"],
        ["không stack", "không dùng chung"],
        ["stack", "dùng chung"],
      ] as const);
  for (const [from, to] of pairs) {
    if (out.includes(from)) out = out.split(from).join(to);
  }
  return out.replace(/\s{2,}/g, " ").trim();
}

/** Client-side safety net when analyze payload is thin — never invents affiliate links. */
export function enrichProductGuidanceItems(
  items: ProductGuidanceItemDTO[] | undefined,
  ctx: EnrichCtx,
): ProductGuidanceItemDTO[] {
  if (!items?.length) return [];
  const en = isEn(ctx.locale);
  const phase = String(ctx.phase || "").toLowerCase() || "calm_first";
  return items.map((item) => {
    const rawWhy = item.why?.trim() || "";
    const why = plainifyGuidanceText(
      rawWhy ? stripRepeatedContextPrefix(rawWhy, en) : defaultWhy(item.step, phase, en),
      en,
    );
    let benefits = (item.benefits ?? [])
      .map((b) => plainifyGuidanceText(b, en))
      .filter(Boolean);
    if (benefits.length < 2) {
      benefits = mergeBenefits(benefits, defaultBenefits(item.step, phase, en));
    }
    const how_to_use = plainifyGuidanceText(
      item.how_to_use?.trim() || defaultHow(item.step, en),
      en,
    );
    const caution = plainifyGuidanceText(
      item.caution?.trim() || defaultCaution(item.step, phase, en),
      en,
    );
    const name = plainifyGuidanceText(item.name_or_category?.trim() || "", en);
    return {
      ...item,
      name_or_category: name || item.name_or_category,
      why,
      benefits: benefits.slice(0, 4),
      how_to_use,
      caution,
    };
  });
}

function mergeBenefits(existing: string[], defaults: string[]): string[] {
  const out = [...existing];
  for (const d of defaults) {
    if (out.length >= 4) break;
    if (!out.some((x) => x.toLowerCase() === d.toLowerCase())) out.push(d);
  }
  return out;
}

function defaultWhy(step: string, phase: string, en: boolean): string {
  switch (step) {
    case "cleanse":
      return en
        ? "Wash gently — don’t scrub or put strong acids on swollen spots."
        : "Rửa nhẹ nhàng — đừng chà mạnh hay bôi acid lên chỗ đang sưng.";
    case "soothe":
      return en
        ? "Calm redness and tightness before any strong treatment products."
        : "Làm dịu chỗ đỏ và căng trước khi dùng sản phẩm trị mạnh.";
    case "moisturize":
      return phase === "calm_first"
        ? en
          ? "Ease redness and keep skin comfortable — strong treatment can wait."
          : "Giúp da bớt đỏ và dễ chịu hơn — chưa cần sản phẩm trị mạnh."
        : en
          ? "Moisturizer keeps skin comfortable if you add one treatment product."
          : "Dưỡng ẩm giúp da êm nếu bạn đang dùng một sản phẩm trị.";
    case "spf":
      return en
        ? "Morning sunscreen protects sensitive skin and helps prevent new dark marks."
        : "Kem chống nắng mỗi sáng bảo vệ da đang nhạy và hạn chế thâm mới.";
    case "treat":
      return en
        ? "Use at most one treatment product at night — never two strong ones together."
        : "Tối đa một sản phẩm trị mỗi đêm — không dùng hai loại mạnh cùng lúc.";
    default:
      return en
        ? "Fits this care step for your skin right now."
        : "Phù hợp bước này với tình trạng da hiện tại của bạn.";
  }
}

function defaultBenefits(step: string, phase: string, en: boolean): string[] {
  if (step === "cleanse") {
    return en
      ? ["Cleans gently", "Less likely to sting after washing", "Does not scrub swollen spots"]
      : ["Làm sạch nhẹ", "Ít gây rát sau khi rửa", "Không chà lên chỗ đang sưng"];
  }
  if (step === "moisturize") {
    return phase === "calm_first"
      ? en
        ? ["Eases redness", "Helps skin feel less tight", "Comfort on sore spots"]
        : ["Làm dịu chỗ đang đỏ", "Giúp da đỡ khô căng", "Êm vùng đang sưng"]
      : en
        ? ["Keeps skin comfortable", "Easier to tolerate one treatment", "Overnight comfort"]
        : ["Giữ da dễ chịu", "Dễ chịu hơn khi có sản phẩm trị", "Êm da qua đêm"];
  }
  if (step === "spf") {
    return en
      ? ["Daily sun protection", "Helps prevent new dark marks", "Shields sensitive skin"]
      : ["Chống nắng mỗi ngày", "Hạn chế thâm mới sau mụn", "Bảo vệ da đang nhạy"];
  }
  if (step === "soothe") {
    return en
      ? ["Calms redness", "Light hydration", "Preps for moisturizer"]
      : ["Làm dịu cảm giác đỏ", "Cấp ẩm nhẹ", "Chuẩn bị kem dưỡng"];
  }
  if (step === "treat") {
    return en
      ? ["Targets congestion gradually", "One change at a time", "Optional if skin stings"]
      : ["Giúp giảm tắc nghẽn dần", "Đổi một thứ một lúc", "Tuỳ chọn nếu da rát"];
  }
  return en
    ? ["Supports this care step", "Fits your skin right now"]
    : ["Hỗ trợ bước này", "Phù hợp tình trạng da hiện tại"];
}

function defaultHow(step: string, en: boolean): string {
  switch (step) {
    case "cleanse":
      return en
        ? "Lukewarm water, about 30 seconds, soft press — morning and evening."
        : "Nước ấm, khoảng 30 giây, miết nhẹ — sáng và tối.";
    case "soothe":
      return en
        ? "Pat a thin layer; skip if it stings."
        : "Vỗ lớp mỏng; bỏ qua nếu đang rát.";
    case "moisturize":
      return en
        ? "Apply on slightly damp skin; cover red or dry areas."
        : "Thoa khi da còn hơi ẩm; phủ đủ chỗ đỏ hoặc khô.";
    case "spf":
      return en
        ? "Every morning as the last step — including near windows."
        : "Mỗi sáng, bước cuối — kể cả gần cửa sổ.";
    case "treat":
      return en
        ? "2–3 nights a week on a small area; moisturize after."
        : "2–3 đêm/tuần, vùng nhỏ; dưỡng ẩm sau.";
    default:
      return en
        ? "Use gently as directed for this step."
        : "Dùng nhẹ theo hướng dẫn cho bước này.";
  }
}

function defaultCaution(step: string, phase: string, en: boolean): string {
  if (phase === "calm_first") {
    return en
      ? "Focus on calming first: skip strong acne treatments this week. Don’t pick or squeeze. Not a medical prescription."
      : "Ưu tiên làm dịu trước: tuần này chưa dùng sản phẩm trị mụn mạnh. Đừng nặn hay cậy mụn. Đây không phải đơn thuốc.";
  }
  if (step === "treat") {
    return en
      ? "At most one treatment product per night. Stop if irritation rises. Not a medical prescription."
      : "Tối đa một sản phẩm trị mỗi đêm. Ngưng nếu càng kích ứng. Đây không phải đơn thuốc.";
  }
  return en
    ? "Add only one new product per week. Stop if irritation rises."
    : "Mỗi tuần chỉ thêm 1 sản phẩm mới. Ngưng nếu da càng khó chịu.";
}
