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
    const why = rawWhy
      ? stripRepeatedContextPrefix(rawWhy, en)
      : defaultWhy(item.step, phase, en);
    let benefits = (item.benefits ?? []).map((b) => b.trim()).filter(Boolean);
    if (benefits.length < 2) {
      benefits = mergeBenefits(benefits, defaultBenefits(item.step, phase, en));
    }
    const how_to_use = item.how_to_use?.trim() || defaultHow(item.step, en);
    const caution = item.caution?.trim() || defaultCaution(item.step, phase, en);
    return {
      ...item,
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
        ? "Cleanse gently — don’t scrub or push acids on inflamed spots."
        : "Rửa nhẹ — không chà / không đẩy acid lên vùng đang sưng.";
    case "soothe":
      return en
        ? "Calm redness and tightness before any actives."
        : "Làm dịu đỏ / căng trước khi nghĩ tới hoạt chất.";
    case "moisturize":
      return phase === "calm_first"
        ? en
          ? "Soothe redness and support the barrier — strong treat can wait."
          : "Dịu đỏ, hỗ trợ barrier — chưa treat mạnh."
        : en
          ? "Moisturizer keeps comfort around any single active."
          : "Dưỡng ẩm giữ da êm quanh hoạt chất (nếu có).";
    case "spf":
      return en
        ? "Daily SPF protects reactive skin and limits new dark marks."
        : "SPF mỗi sáng bảo vệ da đang kích và giảm thâm mới.";
    case "treat":
      return en
        ? "At most one active — never stack the same night."
        : "Tối đa 1 hoạt chất — không stack cùng đêm.";
    default:
      return en
        ? "Fits this care step for your current phase."
        : "Phù hợp bước này theo giai đoạn da hiện tại.";
  }
}

function defaultBenefits(step: string, phase: string, en: boolean): string[] {
  if (step === "cleanse") {
    return en
      ? ["Removes dirt gently", "Less sting on reactive skin", "No scrubbing inflamed spots"]
      : ["Làm sạch nhẹ", "Ít châm trên da đang kích", "Không chà vùng sưng"];
  }
  if (step === "moisturize") {
    return phase === "calm_first"
      ? en
        ? ["Calms redness / tight feel", "Supports barrier repair", "Comfort on inflamed zones"]
        : ["Làm dịu đỏ / căng", "Hỗ trợ barrier", "Êm vùng đang viêm"]
      : en
        ? ["Supports the barrier", "Easier active tolerance", "Overnight comfort"]
        : ["Hỗ trợ barrier", "Dễ chịu hơn khi có treat", "Êm da qua đêm"];
  }
  if (step === "spf") {
    return en
      ? ["Daily UV protection", "Helps prevent new dark marks", "Shields healing skin"]
      : ["Chống nắng mỗi ngày", "Giảm thâm mới", "Bảo vệ da phục hồi"];
  }
  if (step === "soothe") {
    return en
      ? ["Calms redness", "Light hydration", "Preps for moisturizer"]
      : ["Làm dịu đỏ", "Cấp ẩm nhẹ", "Chuẩn bị kem dưỡng"];
  }
  if (step === "treat") {
    return en
      ? ["Targets congestion gradually", "One change at a time", "Optional if skin stings"]
      : ["Nhắm tắc nghẽn dần", "Đổi một thứ một lúc", "Tuỳ chọn nếu da rát"];
  }
  return en
    ? ["Supports this care step", "Fits your phase"]
    : ["Hỗ trợ bước này", "Phù hợp giai đoạn da"];
}

function defaultHow(step: string, en: boolean): string {
  switch (step) {
    case "cleanse":
      return en
        ? "Lukewarm water, ~30 seconds, soft press — morning and evening."
        : "Nước ấm, khoảng 30 giây, miết nhẹ — sáng và tối.";
    case "soothe":
      return en
        ? "Pat a thin layer; skip if it stings."
        : "Vỗ lớp mỏng; bỏ qua nếu đang châm.";
    case "moisturize":
      return en
        ? "Apply on slightly damp skin; cover red or dry zones."
        : "Thoa khi da còn hơi ẩm; đủ trên vùng đỏ / khô.";
    case "spf":
      return en
        ? "Every morning as the last step — including near windows."
        : "Mỗi sáng, bước cuối — kể cả gần cửa sổ.";
    case "treat":
      return en
        ? "2–3 nights/week on a small area; moisturize after."
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
      ? "Calm first: no BHA/retinoid this week. Don’t pick or squeeze. Not a prescription."
      : "Làm dịu trước: tuần này chưa BHA/retinoid. Không nặn / không cậy. Không phải kê đơn.";
  }
  if (step === "treat") {
    return en
      ? "At most one active per night. Stop if irritation rises. Not a prescription."
      : "Tối đa 1 hoạt chất mỗi đêm. Ngưng nếu càng kích ứng. Không phải kê đơn.";
  }
  return en
    ? "Add only one new product per week. Stop if irritation rises."
    : "Mỗi tuần chỉ thêm 1 sản phẩm mới. Ngưng nếu càng kích ứng.";
}
