import type { OnboardingSkinAnalyzeDTO } from "../../../lib/types/onboarding-ai";
import type { ProductGuidanceItemDTO } from "../../../lib/types/product-guidance";

/**
 * Real SKUs from backend/internal/service/ai/affiliate_catalog.json.
 * Links must stay on s.shopee.vn — never invent affiliate URLs in tests.
 */
export const CATALOG_CLEANSE = {
  id: "cerave-foaming-cleanser",
  brand: "CeraVe",
  product_name: "Sữa rửa mặt tạo bọt",
  affiliate_link: "https://s.shopee.vn/70HPIj8Km4",
  price_range: "466k",
  step: "cleanse",
} as const;

export const CATALOG_SPF = {
  id: "biore-uv-aqua-rich",
  brand: "Biore",
  product_name: "Tinh chất chống nắng Biore UV Aqua Rich SPF50+",
  affiliate_link: "https://s.shopee.vn/1BJcMMK4au",
  price_range: "171k",
  step: "spf",
} as const;

/** Allowed affiliate hosts for smoke asserts (catalog-only). */
export const ALLOWED_AFFILIATE_HOST_RE = /^https:\/\/s\.shopee\.vn\//i;

function guidanceItem(
  partial: Omit<ProductGuidanceItemDTO, "phase" | "benefits" | "how_to_use"> &
    Partial<Pick<ProductGuidanceItemDTO, "benefits" | "how_to_use" | "caution">>,
): ProductGuidanceItemDTO {
  return {
    phase: "calm_first",
    category: partial.category || partial.step,
    name_or_category: partial.name_or_category,
    why: partial.why,
    benefits: partial.benefits ?? ["Hỗ trợ bước chăm sóc này."],
    how_to_use: partial.how_to_use ?? "Dùng nhẹ theo hướng dẫn cho bước này.",
    caution: partial.caution,
    affiliate_product_id: partial.affiliate_product_id,
    product_name: partial.product_name,
    brand: partial.brand,
    affiliate_link: partial.affiliate_link,
    price_range: partial.price_range,
    step: partial.step,
  };
}

/**
 * Dense inflammatory fixture → calm_first (no treat / BHA / BP commerce).
 * Exactly 2 catalog CTAs (cleanse + SPF); moisturize stays role-only.
 */
export function denseCalmFirstAnalyzeFixture(): OnboardingSkinAnalyzeDTO {
  const product_guidance: ProductGuidanceItemDTO[] = [
    guidanceItem({
      step: "cleanse",
      category: "cleanser",
      name_or_category: `${CATALOG_CLEANSE.brand} · ${CATALOG_CLEANSE.product_name}`,
      why: "Với vùng má viêm dày: rửa dịu — không chà / không đẩy acid lên nốt đang sưng.",
      benefits: ["Làm sạch nhẹ", "Ít châm trên da đang kích", "Không chà vùng sưng"],
      how_to_use: "Nước ấm, khoảng 30 giây, miết nhẹ — sáng và tối.",
      caution: "Làm dịu trước: tuần này chưa BHA/retinoid. Không nặn / không cậy.",
      affiliate_product_id: CATALOG_CLEANSE.id,
      product_name: CATALOG_CLEANSE.product_name,
      brand: CATALOG_CLEANSE.brand,
      affiliate_link: CATALOG_CLEANSE.affiliate_link,
      price_range: CATALOG_CLEANSE.price_range,
    }),
    guidanceItem({
      step: "moisturize",
      category: "moisturizer",
      name_or_category: "Kem dưỡng ẩm dịu",
      why: "Với má viêm dày: ưu tiên phục hồi barrier trước — chưa treat mạnh.",
      benefits: ["Hỗ trợ barrier", "Giảm khô căng", "Êm vùng đang viêm"],
      how_to_use: "Thoa khi da còn hơi ẩm; đủ trên vùng đỏ / khô.",
      caution: "Tuần này chưa stack hoạt chất mạnh. Không nặn.",
    }),
    guidanceItem({
      step: "spf",
      category: "spf",
      name_or_category: `${CATALOG_SPF.brand} · ${CATALOG_SPF.product_name}`,
      why: "Với da đang viêm: SPF mỗi sáng bảo vệ vùng phục hồi và giảm thâm mới.",
      benefits: ["Bảo vệ UV", "Giảm nguy cơ thâm mới", "Che nắng da đang kích"],
      how_to_use: "Mỗi sáng, bước cuối — kể cả gần cửa sổ.",
      caution: "Vẫn cần SPF khi da viêm — bỏ active mạnh, không bỏ nắng.",
      affiliate_product_id: CATALOG_SPF.id,
      product_name: CATALOG_SPF.product_name,
      brand: CATALOG_SPF.brand,
      affiliate_link: CATALOG_SPF.affiliate_link,
      price_range: CATALOG_SPF.price_range,
    }),
  ];

  return {
    skin_type_guess: "combo",
    undertone_guess: "prefer_not",
    concerns: ["acne", "redness", "irritated"],
    suggested_goal: "clear_acne",
    barrier_signal: "compromised",
    confidence: 0.86,
    visual_observations: ["Dense inflammatory lesions on cheeks"],
    coaching_notes: "E2E fixture: dense inflammatory — calm_first only.",
    non_diagnostic: "Not a medical diagnosis.",
    photo_quality: { sufficient: true, tips: [] },
    skin_observations: {
      overall_skin_type: "combination",
      t_zone: "oily",
      cheeks: "inflamed",
      pore_size: "visible",
      texture: "uneven",
      redness: "high",
      pigmentation: "mild",
      acne_status: "active_dense",
      oiliness_level: "moderate",
    },
    detailed_observations: "Dense inflammatory acne — fixture for e2e.",
    main_concerns: ["inflammatory_acne", "redness"],
    skin_tone: "medium",
    model_used: "e2e-fixture",
    severity_level: "dense",
    primary_regions: ["cheeks"],
    concern_types: ["inflammatory_acne", "redness"],
    phase: "calm_first",
    summary: "Da đang viêm dày — ưu tiên làm dịu, chưa thêm hoạt chất mạnh.",
    product_guidance,
  };
}

/** Mild / can_add_active — PM may include at most one optional active. */
export function canAddActiveAnalyzeFixture(): OnboardingSkinAnalyzeDTO {
  const base = denseCalmFirstAnalyzeFixture();
  return {
    ...base,
    severity_level: "mild",
    phase: "can_add_active",
    concern_types: ["comedones", "oiliness"],
    main_concerns: ["comedones"],
    summary: "Da ổn hơn — có thể cân nhắc tối đa 1 hoạt chất nhẹ vào tối.",
    coaching_notes: "E2E fixture: can_add_active — one optional PM active.",
    product_guidance: (base.product_guidance ?? []).map((g) => ({
      ...g,
      phase: "can_add_active",
    })),
  };
}
