import type { AffiliateFitTag, AffiliateStep } from "./types";

type WhyLocale = "vi" | "en";

const COPY: Record<WhyLocale, Record<string, string>> = {
  vi: {
    sunscreenMissing:
      "Tủ đồ của bạn chưa có kem chống nắng — bước này giúp da không thâm thêm.",
    sunscreenGeneral:
      "Kem chống nắng là bước hữu ích cho mọi loại da, kể cả ngày ở trong nhà.",
    oilyCleanser:
      "Da bạn hay đổ dầu, sữa rửa mặt tạo bọt giúp sạch dầu mà không khô căng.",
    acneCleanser:
      "Da bạn hay có mụn, sữa rửa mặt dịu giúp lỗ chân lông thông thoáng hơn.",
    dryCleanser: "Da bạn thiên khô, sữa rửa mặt dịu giúp sạch mà không kéo căng.",
    acneSerum: "Da bạn hay có mụn, serum này hỗ trợ da thông thoáng hơn mỗi ngày.",
    oilyDefault: "Da bạn hay đổ dầu, sản phẩm này giúp sạch dầu mà vẫn dễ chịu.",
    hydrationSensitive:
      "Da bạn cần cấp ẩm và dễ kích, serum dịu giúp da mềm mà không nặng mặt.",
    hydration: "Da bạn đang thiếu ẩm, bước này giúp da mềm hơn.",
    pores: "Lỗ chân lông bạn dễ bí, sản phẩm này giúp da trông thông thoáng hơn.",
    darkSpots: "Da bạn hay thâm sạm, dùng đều bước này giúp da đều màu hơn.",
    barrier: "Da bạn đang cần phục hồi, lớp dưỡng dịu giúp da bớt căng.",
    sensitive: "Da bạn dễ kích, sản phẩm dịu giúp chăm da mà không chà sát.",
    dryMoisturizer: "Da bạn thiên khô, kem dưỡng giúp giữ lớp ẩm lâu hơn.",
    dryDefault: "Da bạn thiên khô, bước này giúp da mềm và đỡ căng.",
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
      "Your shelf has no sunscreen yet — this step helps keep marks from getting darker.",
    sunscreenGeneral: "Sunscreen helps every skin type, including days spent indoors.",
    oilyCleanser:
      "Your skin gets oily, and a foaming cleanser can lift oil without leaving it tight.",
    acneCleanser:
      "Breakouts show up for you, and a gentle cleanser can keep pores feeling clearer.",
    dryCleanser: "Your skin runs dry, and a gentle cleanser can clean without that tight feel.",
    acneSerum: "Breakouts show up for you, and this serum can help skin feel clearer day to day.",
    oilyDefault: "Your skin gets oily, and this can lift oil while staying comfortable.",
    hydrationSensitive:
      "Your skin wants moisture and reacts easily, so a gentle serum can soften it without feeling heavy.",
    hydration: "Your skin is running low on moisture, and this step can help it feel softer.",
    pores: "Pores clog easily for you, and this can help skin look less congested.",
    darkSpots: "Dark marks show up for you, and steady use of this step can help tone look more even.",
    barrier: "Your skin could use some recovery, and a gentle layer can ease that tight feel.",
    sensitive: "Your skin reacts easily, and a gentle product can care for it without rubbing.",
    dryMoisturizer: "Your skin runs dry, and a moisturizer can help hold water in longer.",
    dryDefault: "Your skin runs dry, and this step can help it feel softer and less tight.",
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
