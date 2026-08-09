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

/** Client-side safety net when analyze payload is thin — never invents affiliate links. */
export function enrichProductGuidanceItems(
  items: ProductGuidanceItemDTO[] | undefined,
  ctx: EnrichCtx,
): ProductGuidanceItemDTO[] {
  if (!items?.length) return [];
  const en = isEn(ctx.locale);
  const phase = String(ctx.phase || "").toLowerCase() || "calm_first";
  return items.map((item) => {
    const why = item.why?.trim() || defaultWhy(item.step, phase, ctx, en);
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

function regionBit(regions: string[] | undefined, en: boolean): string {
  if (!regions?.length) return "";
  const map: Record<string, { en: string; vi: string }> = {
    cheeks: { en: "cheeks", vi: "má" },
    t_zone: { en: "T-zone", vi: "chữ T" },
    forehead: { en: "forehead", vi: "trán" },
  };
  const labels = regions.slice(0, 2).map((r) => {
    const hit = map[r.toLowerCase()];
    return hit ? (en ? hit.en : hit.vi) : r;
  });
  return en ? labels.join(" & ") : labels.join(" và ");
}

function defaultWhy(
  step: string,
  phase: string,
  ctx: EnrichCtx,
  en: boolean,
): string {
  const region = regionBit(ctx.regions, en);
  const dense = String(ctx.severity || "").toLowerCase() === "dense";
  const situ = en
    ? [region && `on ${region}`, dense && "dense inflammation"]
        .filter(Boolean)
        .join(", ") || "your current skin phase"
    : [region && `vùng ${region}`, dense && "viêm dày / đỏ"]
        .filter(Boolean)
        .join(", ") || "giai đoạn da hiện tại";

  switch (step) {
    case "cleanse":
      return en
        ? `For ${situ} — cleanse gently; don’t scrub or push acids on inflamed spots.`
        : `Với ${situ} — rửa dịu, không chà / không đẩy acid lên vùng đang sưng.`;
    case "soothe":
      return en
        ? `For ${situ} — calm redness before any actives.`
        : `Với ${situ} — làm dịu đỏ/căng trước khi nghĩ tới hoạt chất.`;
    case "moisturize":
      return phase === "calm_first"
        ? en
          ? `For ${situ} — repair comfort first; strong treat can wait.`
          : `Với ${situ} — phục hồi / êm da trước, chưa treat mạnh.`
        : en
          ? `For ${situ} — moisturizer keeps comfort around any single active.`
          : `Với ${situ} — dưỡng ẩm giữ da êm quanh hoạt chất (nếu có).`;
    case "spf":
      return en
        ? `For ${situ} — daily SPF protects healing skin and limits new dark marks.`
        : `Với ${situ} — SPF mỗi sáng bảo vệ da phục hồi và giảm thâm mới.`;
    case "treat":
      return en
        ? `For ${situ} — at most one active; never stack the same night.`
        : `Với ${situ} — tối đa 1 hoạt chất; không stack cùng đêm.`;
    default:
      return en
        ? `Fits ${situ} for this care step.`
        : `Phù hợp ${situ} cho bước chăm sóc này.`;
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
        ? ["Supports barrier repair", "Reduces tight feel", "Comfort on inflamed zones"]
        : ["Hỗ trợ barrier", "Giảm khô căng", "Êm vùng đang viêm"]
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
