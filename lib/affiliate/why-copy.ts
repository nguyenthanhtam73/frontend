import type { AffiliateFitTag, AffiliateStep } from "./types";

type WhyLocale = "vi" | "en";

const COPY: Record<WhyLocale, Record<string, string>> = {
  vi: {
    sunscreenMissing:
      "Tủ đồ của bạn chưa có kem chống nắng — bước này giúp bảo vệ da khỏi nắng mỗi ngày.",
    sunscreenGeneral:
      "Kem chống nắng là bước hữu ích cho mọi loại da, kể cả ngày ở trong nhà.",
    oilyCleanser: "Da bạn hay đổ dầu, sữa rửa mặt tạo bọt là kiểu hay dùng cho da dầu.",
    acneCleanser: "Da bạn hay có mụn, sữa rửa mặt dịu là kiểu hay dùng khi da hay có mụn.",
    dryCleanser: "Da bạn thiên khô, sữa rửa mặt dịu là kiểu hay dùng cho da khô.",
    acneSerum: "Da bạn hay có mụn, serum này là kiểu hay được chọn khi da hay có mụn.",
    oilyDefault: "Da bạn hay đổ dầu, sản phẩm này là kiểu hay dùng cho da dầu.",
    hydrationSensitive:
      "Da bạn cần cấp ẩm và dễ kích, serum dịu là kiểu hay được chọn cho da đó.",
    hydration: "Da bạn đang thiếu ẩm, bước này là kiểu hay được chọn khi da thiếu ẩm.",
    pores: "Lỗ chân lông bạn dễ bí, sản phẩm này là kiểu hay được chọn cho da dễ bí.",
    darkSpots: "Da bạn hay thâm sạm, sản phẩm này hay được chọn cho da có vết thâm.",
    barrier: "Da bạn đang cần phục hồi, lớp dưỡng dịu là kiểu hay được chọn lúc da cần nghỉ.",
    sensitive: "Da bạn dễ kích, sản phẩm dịu là kiểu hay được chọn cho da dễ kích.",
    dryMoisturizer: "Da bạn thiên khô, kem dưỡng là kiểu hay dùng cho da khô.",
    dryDefault: "Da bạn thiên khô, bước này là kiểu hay dùng cho da khô.",
    normal: "Da bạn thiên thường, sản phẩm này giữ nhịp chăm da nhẹ nhàng.",
    budget: "Mức giá dễ thử, vẫn là bước chăm da cơ bản hợp nhiều loại da.",
    cleanserKnown:
      "Tủ đồ của bạn chưa có sữa rửa mặt — bước này giúp da sạch trước khi dưỡng.",
    cleanser: "Sữa rửa mặt giúp da sạch trước khi dưỡng.",
    moisturizerKnown:
      "Tủ đồ của bạn chưa có kem dưỡng — bước này giúp da đỡ khô sau khi rửa.",
    moisturizer: "Kem dưỡng giúp da đỡ khô sau khi rửa.",
    serumKnown: "Tủ đồ của bạn chưa có serum — một lớp mỏng bổ sung bước da đang thiếu.",
    serum: "Một lớp serum mỏng bổ sung bước dưỡng da đang thiếu.",
    makeup_removerKnown:
      "Tủ đồ của bạn chưa có nước tẩy trang — bước này giúp sạch lớp trang điểm trước khi rửa mặt.",
    makeup_remover: "Nước tẩy trang giúp sạch lớp trang điểm trước khi rửa mặt.",
    supportKnown: "Tủ đồ của bạn chưa có khăn dùng một lần — tiện khi da đang nhạy.",
    support: "Khăn dùng một lần tiện khi da đang nhạy, đỡ dùng lại khăn còn ẩm.",
  },
  en: {
    sunscreenMissing:
      "Your shelf has no sunscreen yet — this step helps shield skin from the sun each day.",
    sunscreenGeneral: "Sunscreen helps every skin type, including days spent indoors.",
    oilyCleanser: "Your skin gets oily, and a foaming cleanser is a common pick for oily skin.",
    acneCleanser: "Breakouts show up for you, and a gentle cleanser is a common pick for that.",
    dryCleanser: "Your skin runs dry, and a gentle cleanser is a common pick for dry skin.",
    acneSerum: "Breakouts show up for you, and this serum is a common pick for that.",
    oilyDefault: "Your skin gets oily, and this is a common pick for oily skin.",
    hydrationSensitive:
      "Your skin wants moisture and reacts easily, and a gentle serum is a common pick for that.",
    hydration: "Your skin is running low on moisture, and this step is a common pick for that.",
    pores: "Pores clog easily for you, and this is a common pick for congested skin.",
    darkSpots: "Dark marks show up for you, and this is often chosen for skin with dark marks.",
    barrier: "Your skin could use some recovery, and a gentle layer is a common pick while it rests.",
    sensitive: "Your skin reacts easily, and a gentle product is a common pick for that.",
    dryMoisturizer: "Your skin runs dry, and a moisturizer is a common pick for dry skin.",
    dryDefault: "Your skin runs dry, and this step is a common pick for dry skin.",
    normal: "Your skin is closer to balanced, and this keeps a light routine going.",
    budget: "An easy price to try, and still a basic step that suits many skin types.",
    cleanserKnown: "Your shelf has no cleanser yet — this step cleans skin before moisturizer.",
    cleanser: "A cleanser cleans skin before moisturizer.",
    moisturizerKnown: "Your shelf has no moisturizer yet — this step eases tightness after washing.",
    moisturizer: "Moisturizer eases tightness after washing.",
    serumKnown: "Your shelf has no serum yet — a thin layer fills a step that is missing.",
    serum: "A thin serum layer fills a care step that is missing.",
    makeup_removerKnown:
      "Your shelf has no makeup remover yet — this step clears makeup before washing.",
    makeup_remover: "Makeup remover clears makeup before washing.",
    supportKnown: "Your shelf has no single-use towel yet — handy when skin feels reactive.",
    support: "A single-use towel is handy when skin feels reactive, instead of a damp towel.",
  },
};

function has(tags: readonly AffiliateFitTag[], tag: AffiliateFitTag): boolean {
  return tags.includes(tag);
}

/** One short line. No cure claims — the copy never says a product clears or whitens skin. */
export function whyLine(opts: {
  step: AffiliateStep;
  fit: readonly AffiliateFitTag[];
  matched: readonly AffiliateFitTag[];
  cabinetKnown: boolean;
  locale: WhyLocale;
}): string {
  const copy = COPY[opts.locale];
  if (opts.step === "sunscreen" && opts.cabinetKnown) return copy.sunscreenMissing!;
  if (opts.step === "sunscreen") return copy.sunscreenGeneral!;

  const matched = opts.matched;
  if (has(matched, "oily") && opts.step === "cleanser") return copy.oilyCleanser!;
  if (has(matched, "acne") && opts.step === "cleanser") return copy.acneCleanser!;
  if (has(matched, "dry") && opts.step === "cleanser") return copy.dryCleanser!;
  if (has(matched, "acne") && opts.step === "serum") return copy.acneSerum!;
  if (has(matched, "hydration") && has(matched, "sensitive")) return copy.hydrationSensitive!;
  if (has(matched, "hydration")) return copy.hydration!;
  if (has(matched, "pores")) return copy.pores!;
  if (has(matched, "dark_spots")) return copy.darkSpots!;
  if (has(matched, "barrier")) return copy.barrier!;
  if (has(matched, "sensitive")) return copy.sensitive!;
  if (has(matched, "oily")) return copy.oilyDefault!;
  if (has(matched, "dry") && opts.step === "moisturizer") return copy.dryMoisturizer!;
  if (has(matched, "dry")) return copy.dryDefault!;
  if (has(matched, "normal")) return copy.normal!;
  if (opts.fit.includes("budget") && matched.length === 0) return copy.budget!;

  if (opts.cabinetKnown) return copy[`${opts.step}Known`] ?? copy[opts.step]!;
  return copy[opts.step]!;
}

/** Every shipped sentence, for the "no cure promise" test. */
export function allWhySentences(): string[] {
  return Object.values(COPY).flatMap((table) => Object.values(table));
}
