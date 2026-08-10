import {
  buildStarterPackBullets,
  type OnboardingState,
  type SkinGoal,
  type SkinTypeCard,
} from "@/lib/stores/onboarding-store";
import type { OnboardingCarePhase } from "@/lib/types/onboarding-ai";
import type { ProductGuidanceItemDTO } from "@/lib/types/product-guidance";
import type { StarterRoutineDTO } from "@/lib/types/starter-routine";

function isEn(locale: string) {
  return locale === "en" || locale.toLowerCase().startsWith("en");
}

/** Title — detail lines so Step 2 never shows title === subtitle. */
function step(title: string, detail: string): string {
  return `${title} — ${detail}`;
}

export type StarterCarePhase = OnboardingCarePhase | "manual";

/**
 * Resolve care phase for Step-2 scaffolding.
 * Prefer analyze-skin phase; dense + inflammatory ⇒ calm_first; no AI ⇒ manual.
 */
export function resolveStarterCarePhase(ob: OnboardingState): StarterCarePhase {
  const snap = ob.aiSnapshot;
  if (!snap) return "manual";

  const phase = String(snap.phase ?? "").trim().toLowerCase();
  if (phase === "calm_first" || phase === "can_add_active") {
    return phase;
  }

  const severity = String(snap.severity_level ?? "").trim().toLowerCase();
  const types = (snap.concern_types ?? snap.main_concerns ?? []).map((t) =>
    String(t).toLowerCase(),
  );
  const inflammatory = types.some((t) =>
    /inflammatory|irritat|redness|acne|pustule|papule|cystic/.test(t),
  );
  // Align with BE derivePhase: dense / moderate+inflammatory → calm; lean calm when uncertain.
  if (severity === "dense") return "calm_first";
  if (severity === "moderate" && inflammatory) return "calm_first";
  if (severity === "mild") return "can_add_active";
  if (severity === "moderate") return "can_add_active";
  return "calm_first";
}

function morningCalmFirst(locale: string, skin: SkinTypeCard | null): string[] {
  const en = isEn(locale);
  if (skin === "oily") {
    return en
      ? [
          step("Gentle gel cleanser", "cleans oil lightly — don’t scrub hard"),
          step("Light oil-free moisturizer", "thin layer so skin feels calm, not greasy"),
          step(
            "Morning sunscreen",
            "every morning — window light at home can still darken marks",
          ),
        ]
      : [
          step("Sữa rửa mặt gel dịu", "làm sạch dầu nhẹ — đừng chà mạnh"),
          step("Kem dưỡng nhẹ không dầu", "một lớp mỏng: da đỡ bóng mà vẫn êm"),
          step(
            "Kem chống nắng mỗi sáng",
            "bôi mỗi sáng — nắng cửa sổ trong nhà vẫn có thể làm thâm",
          ),
        ];
  }
  if (skin === "dry") {
    return en
      ? [
          step("Cream cleanser", "wash gently so skin doesn’t feel tight"),
          step(
            "Hydrating moisturizer",
            "apply right after washing while skin is still a bit damp so it absorbs better",
          ),
          step("Morning sunscreen", "every morning to protect and keep comfort"),
        ]
      : [
          step("Sữa rửa mặt dạng kem", "rửa nhẹ để da không bị căng"),
          step(
            "Kem dưỡng cấp ẩm",
            "thoa ngay sau rửa, lúc da còn ẩm một chút để kem thấm tốt hơn",
          ),
          step("Kem chống nắng mỗi sáng", "bôi mỗi sáng để bảo vệ và giữ da êm"),
        ];
  }
  if (skin === "sensitive") {
    return en
      ? [
          step("Fragrance-free cleanser", "lukewarm water is enough"),
          step("Simple moisturizer", "short formula for easily irritated skin"),
          step(
            "Mineral-leaning sunscreen",
            "try a little on the jaw first if you’re often sensitive",
          ),
        ]
      : [
          step("Sữa rửa mặt không mùi", "nước ấm là đủ"),
          step("Kem dưỡng tối giản", "công thức ngắn cho da dễ kích ứng"),
          step(
            "Kem chống nắng dịu (ưu tiên khoáng)",
            "thử ít ở hàm trước nếu da hay nhạy",
          ),
        ];
  }
  return en
    ? [
        step("Gentle cleanser", "about 30 seconds, lukewarm water — don’t scrub hard"),
        step(
          "Light moisturizer",
          "apply right after washing while skin is still a bit damp so it absorbs better",
        ),
        step(
          "Morning sunscreen",
          "every morning — window light at home can still darken marks",
        ),
      ]
    : [
        step("Sữa rửa mặt dịu", "khoảng 30 giây, nước ấm — đừng chà mạnh"),
        step(
          "Kem dưỡng ẩm nhẹ",
          "thoa ngay sau rửa, lúc da còn ẩm một chút để kem thấm tốt hơn",
        ),
        step(
          "Kem chống nắng mỗi sáng",
          "bôi mỗi sáng — nắng cửa sổ trong nhà vẫn có thể làm thâm",
        ),
      ];
}

function eveningCalmFirst(locale: string): string[] {
  const en = isEn(locale);
  return en
    ? [
        step(
          "Gentle cleanse",
          "remove sunscreen lightly — don’t leave skin tight or dry",
        ),
        step(
          "Repair moisturizer",
          "comfort overnight — skip strong acne treatments this week",
        ),
      ]
    : [
        step(
          "Rửa mặt dịu",
          "gỡ kem chống nắng nhẹ — đừng để da khô căng",
        ),
        step(
          "Kem dưỡng phục hồi",
          "giữ da êm qua đêm — tuần này chưa thêm sản phẩm trị mụn mạnh",
        ),
      ];
}

function eveningCanAddActive(locale: string): string[] {
  const en = isEn(locale);
  return en
    ? [
        step("Cleanse", "remove sunscreen gently"),
        step(
          "Optional: one BHA or retinoid",
          "not both the same night — skip if skin stings",
        ),
        step("Moisturizer", "seal comfort overnight after the active"),
      ]
    : [
        step("Rửa mặt", "gỡ kem chống nắng nhẹ nhàng"),
        step(
          "Tuỳ chọn: tối đa 1 BHA hoặc retinoid",
          "không dùng chung một đêm — bỏ qua nếu da rát",
        ),
        step("Kem dưỡng ẩm", "khóa ẩm sau bước trị"),
      ];
}

function morningForProfile(
  skin: SkinTypeCard | null,
  goal: SkinGoal | null,
  locale: string,
): string[] {
  const en = isEn(locale);
  const base =
    skin === "oily"
      ? en
        ? [
            step("Gel cleanser", "clears oil without scrubbing hard"),
            step("Light oil-free moisturizer", "a thin layer keeps skin comfortable"),
            step(
              "Morning sunscreen",
              "every morning — window light at home can still darken marks",
            ),
          ]
        : [
            step("Sữa rửa mặt dạng gel", "làm sạch dầu, không chà mạnh"),
            step("Kem dưỡng nhẹ không dầu", "một lớp mỏng cho da đỡ bóng mà vẫn êm"),
            step(
              "Kem chống nắng buổi sáng",
              "bôi mỗi sáng — nắng cửa sổ trong nhà vẫn có thể làm thâm",
            ),
          ]
      : skin === "dry"
        ? en
          ? [
              step("Cream cleanser", "wash gently so skin doesn’t feel tight"),
              step(
                "Hydrating moisturizer",
                "apply right after washing while skin is still a bit damp so it absorbs better",
              ),
              step("Morning sunscreen", "lock in comfort and protect"),
            ]
          : [
              step("Sữa rửa mặt dạng kem", "rửa nhẹ, xong không bị căng"),
              step(
                "Kem dưỡng cấp ẩm",
                "thoa ngay sau rửa, lúc da còn ẩm một chút để kem thấm tốt hơn",
              ),
              step("Kem chống nắng mỗi sáng", "bôi mỗi sáng để bảo vệ và giữ da êm"),
            ]
        : skin === "sensitive"
          ? en
            ? [
                step("Fragrance-free cleanser", "lukewarm water only"),
                step("Simple moisturizer", "short formula for easily irritated skin"),
                step("Mineral sunscreen", "patch-test on the jaw if unsure"),
              ]
            : [
                step("Sữa rửa mặt không mùi", "nước ấm là đủ"),
                step("Kem dưỡng tối giản", "công thức ngắn cho da dễ kích ứng"),
                step("Kem chống nắng khoáng", "thử ít ở hàm nếu hay nhạy"),
              ]
          : en
            ? [
                step("Gentle cleanser", "about 30 seconds, lukewarm water"),
                step(
                  "Light moisturizer",
                  "apply right after washing while skin is still a bit damp so it absorbs better",
                ),
                step(
                  "Daily morning sunscreen",
                  "every morning — window light at home can still darken marks",
                ),
              ]
            : [
                step("Sữa rửa mặt dịu", "khoảng 30 giây, nước ấm"),
                step(
                  "Kem dưỡng ẩm nhẹ",
                  "thoa ngay sau rửa, lúc da còn ẩm một chút để kem thấm tốt hơn",
                ),
                step(
                  "Kem chống nắng mỗi sáng",
                  "bôi mỗi sáng — nắng cửa sổ trong nhà vẫn có thể làm thâm",
                ),
              ];

  void goal; // goal shapes evening / week notes; AM stays cleanse→moist→SPF
  return base.slice(0, 3);
}

function eveningForProfile(
  skin: SkinTypeCard | null,
  goal: SkinGoal | null,
  locale: string,
): string[] {
  const en = isEn(locale);

  // Acne / barrier: week-1 evening stays calm without photo phase.
  if (goal === "clear_acne" || goal === "barrier") {
    return eveningCalmFirst(locale);
  }

  if (skin === "oily") {
    return en
      ? [
          step("Double cleanse if needed", "remove sunscreen or makeup gently"),
          step("Light moisturizer", "enough comfort, not a heavy coat"),
          step(
            "Optional: mild exfoliant 2–3×/week",
            "only when skin is calm — patch test first",
          ),
        ]
      : [
          step("Tẩy trang kép nếu cần", "gỡ makeup hoặc kem chống nắng nhẹ"),
          step("Kem dưỡng nhẹ", "đủ êm, không phủ dày"),
          step(
            "Tuỳ chọn: tẩy da chết nhẹ 2–3 lần/tuần",
            "chỉ khi da ổn — thử ít ở vùng nhỏ trước",
          ),
        ];
  }
  if (skin === "dry") {
    return en
      ? [
          step("Oil or balm cleanse", "then a gentle second wash"),
          step("Hydrating toner or essence", "pat — don’t rub"),
          step("Richer moisturizer", "seal comfort on dry nights"),
        ]
      : [
          step("Tẩy trang dầu/balm", "rồi rửa lại nhẹ"),
          step("Toner/essence cấp ẩm", "vỗ — đừng chà"),
          step("Kem dưỡng đặc hơn", "giữ ẩm qua đêm khi da khô"),
        ];
  }
  if (skin === "sensitive") {
    return eveningCalmFirst(locale);
  }

  return en
    ? [
        step("Cleanse", "remove sunscreen gently"),
        step("Moisturizer", "simple overnight comfort"),
        step(
          "Optional: one active",
          "BHA or retinoid — not both the same night",
        ),
      ]
    : [
        step("Rửa mặt", "gỡ kem chống nắng nhẹ"),
        step("Kem dưỡng ẩm", "đủ êm qua đêm"),
        step(
          "Tuỳ chọn: tối đa 1 hoạt chất",
          "BHA hoặc retinoid — không dùng chung một đêm",
        ),
      ];
}

function morningForPhase(
  phase: StarterCarePhase,
  skin: SkinTypeCard | null,
  goal: SkinGoal | null,
  locale: string,
): string[] {
  if (phase === "calm_first" || phase === "can_add_active") {
    return morningCalmFirst(locale, skin);
  }
  return morningForProfile(skin, goal, locale);
}

function eveningForPhase(
  phase: StarterCarePhase,
  skin: SkinTypeCard | null,
  goal: SkinGoal | null,
  locale: string,
): string[] {
  // Manual (no photo) matches BE calm_first — never scaffold optional actives.
  if (phase === "calm_first" || phase === "manual") {
    return eveningCalmFirst(locale);
  }
  if (phase === "can_add_active") return eveningCanAddActive(locale);
  return eveningForProfile(skin, goal, locale);
}

function weekNoteForPhase(
  phase: StarterCarePhase,
  skillMode: OnboardingState["skillMode"],
  locale: string,
): string {
  const en = isEn(locale);
  if (phase === "calm_first" || phase === "manual") {
    return en
      ? "This week: calm first — no strong actives. Consistency beats complexity."
      : "Tuần này: làm dịu trước — chưa thêm sản phẩm trị mụn mạnh. Đều đặn quan trọng hơn nhiều bước.";
  }
  if (phase === "can_add_active") {
    return en
      ? "If you add a treatment: at most one at night — never stack acids the same evening."
      : "Nếu thêm bước trị: tối đa 1 sản phẩm trị mỗi tối — không chồng nhiều acid cùng đêm.";
  }
  if (skillMode === "beginner") {
    return en
      ? "Keep morning to 3 steps this week — consistency beats complexity."
      : "Tuần này giữ sáng 3 bước — đều đặn quan trọng hơn nhiều bước.";
  }
  if (skillMode === "advanced") {
    return en
      ? "When layering acids/retinol, go slow and note how skin feels the next day."
      : "Khi xen kẽ acid/retinol, đi chậm và ghi lại cảm giác da hôm sau.";
  }
  return en
    ? "Journal 5–7 days before changing multiple products."
    : "Ghi nhật ký 5–7 ngày trước khi đổi nhiều sản phẩm cùng lúc.";
}

/** True when guidance copy already covers the no-pick care note. */
export function guidanceMentionsNoPick(
  items: ProductGuidanceItemDTO[] | undefined,
): boolean {
  if (!items?.length) return false;
  return items.some((item) => {
    const blob = [item.caution, item.why, item.how_to_use]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return /không nặn|không cậy|don'?t pick|do not pick|no picking|don'?t squeeze/.test(
      blob,
    );
  });
}

/** Non-step care note under AM/PM (not tickable). */
export function starterCareNote(
  goal: SkinGoal | null,
  locale: string,
  phase?: StarterCarePhase,
  opts?: { guidanceHasNoPickCaution?: boolean },
): string | null {
  const en = isEn(locale);
  // Never contradict can_add_active evening (one optional active is allowed).
  if (phase === "can_add_active") {
    if (goal === "clear_acne" || opts?.guidanceHasNoPickCaution) {
      return en
        ? "Care note: don’t pick or squeeze — cleanse gently and pat dry."
        : "Lưu ý: không nặn / không cậy mụn — rửa nhẹ và thấm khô.";
    }
    return null;
  }
  if (phase === "calm_first" || phase === "manual" || goal === "clear_acne") {
    // Keep the note under AM/PM even when cards already caution “không nặn”
    // (different surface; e2e + scanability). Shorten to avoid triple copy.
    if (opts?.guidanceHasNoPickCaution) {
      return en
        ? "Care note: don’t pick or squeeze — cleanse gently and pat dry."
        : "Lưu ý: không nặn / không cậy mụn — rửa nhẹ và thấm khô.";
    }
    return en
      ? "Care note: don’t pick or squeeze — cleanse gently and pat dry. No strong acne treatments this week."
      : "Lưu ý: không nặn / không cậy mụn — rửa nhẹ và thấm khô. Tuần này chưa thêm sản phẩm trị mụn mạnh.";
  }
  return null;
}

function isCalmScaffoldPhase(phase: StarterCarePhase): boolean {
  return phase === "calm_first" || phase === "manual";
}

function isMoisturizerCategory(item: ProductGuidanceItemDTO): boolean {
  const cat = String(item.category ?? "").toLowerCase();
  const step = String(item.step ?? "").toLowerCase();
  return cat === "moisturizer" || step === "moisturize";
}

function stripCommerceFields(
  item: ProductGuidanceItemDTO,
): ProductGuidanceItemDTO {
  return {
    ...item,
    affiliate_product_id: undefined,
    product_name: undefined,
    brand: undefined,
    affiliate_link: undefined,
    price_range: undefined,
  };
}

/**
 * Fold calm_first soothe into moisturize so Step 2 stays 3 cards (cleanse /
 * moist+soothe / spf). Merges benefits/why only — never re-labels a toner/serum
 * Shopee CTA as “moisturize” (catalog category must stay honest).
 */
export function mergeCalmFirstSootheIntoMoisturize(
  items: ProductGuidanceItemDTO[],
): ProductGuidanceItemDTO[] {
  const soothe = items.filter((i) => String(i.step ?? "").toLowerCase() === "soothe");
  if (!soothe.length) return items;
  const rest = items.filter((i) => String(i.step ?? "").toLowerCase() !== "soothe");
  const moistIdx = rest.findIndex(
    (i) => String(i.step ?? "").toLowerCase() === "moisturize",
  );
  const donor = soothe[0];
  if (moistIdx < 0) {
    // Promote role card only; drop toner/serum commerce so step badge stays truthful.
    const promoted = stripCommerceFields({
      ...donor,
      step: "moisturize",
      category: "moisturizer",
      name_or_category:
        donor.name_or_category?.trim() ||
        donor.product_name?.trim() ||
        donor.why?.trim() ||
        "Moisturizer",
    });
    // If donor was already a moisturizer-tagged soothe (rare), keep commerce.
    if (isMoisturizerCategory(donor) && donor.affiliate_link?.trim()) {
      return [
        ...rest,
        {
          ...promoted,
          affiliate_product_id: donor.affiliate_product_id,
          product_name: donor.product_name,
          brand: donor.brand,
          affiliate_link: donor.affiliate_link,
          price_range: donor.price_range,
        },
      ];
    }
    return [...rest, promoted];
  }
  const moist = { ...rest[moistIdx] };
  const benefits = [...(moist.benefits ?? [])];
  for (const b of donor.benefits ?? []) {
    const t = b.trim();
    if (!t) continue;
    if (benefits.length >= 4) break;
    if (!benefits.some((x) => x.toLowerCase() === t.toLowerCase())) {
      benefits.push(t);
    }
  }
  moist.benefits = benefits.slice(0, 4);
  // Only inherit commerce when the donor is actually a moisturizer SKU.
  if (
    !moist.affiliate_link?.trim() &&
    donor.affiliate_link?.trim() &&
    isMoisturizerCategory(donor)
  ) {
    moist.affiliate_product_id = donor.affiliate_product_id;
    moist.product_name = donor.product_name;
    moist.brand = donor.brand;
    moist.affiliate_link = donor.affiliate_link;
    moist.price_range = donor.price_range;
  }
  if (!moist.why?.trim() && donor.why?.trim()) {
    moist.why = donor.why;
  }
  rest[moistIdx] = moist;
  return rest;
}

/** Drop treat / strong-active guidance cards when phase is calm_first / manual. */
export function filterGuidanceForPhase(
  items: ProductGuidanceItemDTO[] | undefined,
  phase: StarterCarePhase,
): ProductGuidanceItemDTO[] | undefined {
  if (!items?.length) return items;
  if (!isCalmScaffoldPhase(phase)) return items;
  const filtered = items.filter((item) => {
    const step = String(item.step ?? "").toLowerCase();
    if (step === "treat") return false;
    // Identity fields only — do NOT scan `why`/`caution` (calm copy often says
    // “chưa BHA/retinol”, which must not drop the moisturizer card).
    const blob = [item.name_or_category, item.product_name, item.category]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return !/\b(bha|aha|retinol|retinoid|benzoyl|salicylic|treating active)\b|\bbp\b/.test(
      blob,
    );
  });
  return mergeCalmFirstSootheIntoMoisturize(filtered);
}

/** Drop treat suggestions when scaffolding is calm-only. */
export function filterSuggestionsForPhase<
  T extends { step?: string; product_name?: string; category?: string },
>(items: T[] | undefined, phase: StarterCarePhase): T[] | undefined {
  if (!items?.length) return items;
  if (!isCalmScaffoldPhase(phase)) return items;
  return items.filter((item) => {
    if (String(item.step ?? "").toLowerCase() === "treat") return false;
    const blob = [item.product_name, item.category]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return !/\b(bha|aha|retinol|retinoid|benzoyl|salicylic)\b|\bbp\b/.test(blob);
  });
}

/** Care phase from analyze payload alone (Welcome merge / Step 1). */
export function resolveCarePhaseFromAnalysis(analysis?: {
  phase?: string | null;
  severity_level?: string | null;
  concern_types?: string[] | null;
  main_concerns?: string[] | null;
} | null): StarterCarePhase {
  if (!analysis) return "manual";
  return resolveStarterCarePhase({
    aiSnapshot: analysis as OnboardingState["aiSnapshot"],
  } as OnboardingState);
}

/** Safe offline / analyze-aware routine for Step 2. */
export function buildDefaultStarterRoutine(
  ob: OnboardingState,
  locale: string,
): StarterRoutineDTO {
  const bullets = buildStarterPackBullets(ob);
  const en = isEn(locale);
  const coaching = ob.aiSnapshot?.coaching_notes?.trim() ?? "";
  const phase = resolveStarterCarePhase(ob);

  const morning = morningForPhase(phase, ob.skinType, ob.goal, locale);
  const evening = eveningForPhase(phase, ob.skinType, ob.goal, locale);
  const guidance = filterGuidanceForPhase(
    ob.aiSnapshot?.product_guidance,
    phase,
  );

  return {
    morning,
    evening,
    week_notes: weekNoteForPhase(phase, ob.skillMode, locale),
    safety_notes: en
      ? "General skincare guidance only — not medical advice. Stop and see a dermatologist if burning, swelling, or spreading rash."
      : "Chỉ là gợi ý chăm sóc da chung — không thay thế bác sĩ. Ngừng và đi khám nếu cháy rát, sưng hoặc phát ban lan.",
    encouragement: en
      ? "You're starting with a solid, safe base — small daily steps add up."
      : "Bạn đang bắt đầu với nền tảng an toàn — mỗi ngày một chút là đủ.",
    skin_readback: coaching || ob.aiSnapshot?.summary?.trim() || "",
    rationale: bullets[0] ?? "",
    closing_reminder: en
      ? "Start with these steps this week — you can refine as you learn what your skin loves."
      : "Bắt đầu với các bước này tuần này — bạn có thể tinh chỉnh dần khi hiểu da mình hơn.",
    product_guidance: guidance,
    product_suggestions: filterSuggestionsForPhase(
      ob.aiSnapshot?.product_suggestions,
      phase,
    ),
  };
}

/** Prefer Step-1 analyze commerce so welcome matches the funnel. */
export function withAnalyzeCommerce(
  starter: StarterRoutineDTO,
  analysis?: {
    product_guidance?: StarterRoutineDTO["product_guidance"];
    product_suggestions?: StarterRoutineDTO["product_suggestions"];
    phase?: string | null;
    severity_level?: string | null;
    concern_types?: string[] | null;
    main_concerns?: string[] | null;
  } | null,
): StarterRoutineDTO {
  if (!analysis) return starter;
  const phase = resolveCarePhaseFromAnalysis(analysis);
  const hasAnalyzeCommerce =
    Boolean(analysis.product_guidance?.length) ||
    Boolean(analysis.product_suggestions?.length);
  if (!hasAnalyzeCommerce) return starter;

  const guidance = filterGuidanceForPhase(analysis.product_guidance, phase);
  const suggestions = filterSuggestionsForPhase(
    analysis.product_suggestions,
    phase,
  );
  // Never fall back to starter's unfiltered treat commerce when analyze existed
  // but phase-filter emptied it — keep filtered (possibly empty) results.
  return {
    ...starter,
    product_guidance: guidance?.length
      ? guidance
      : filterGuidanceForPhase(starter.product_guidance, phase),
    product_suggestions: suggestions?.length
      ? suggestions
      : filterSuggestionsForPhase(starter.product_suggestions, phase),
  };
}

/** Role title without brand — used by no_ads strip and ProductGuidanceSection. */
export function genericRoleLabel(
  step: string,
  category: string,
  locale: string,
  phase?: string,
): string {
  const en = locale.toLowerCase().startsWith("en");
  const calm =
    String(phase ?? "").toLowerCase() === "calm_first" ||
    String(phase ?? "").toLowerCase() === "manual";
  switch (step.trim().toLowerCase()) {
    case "cleanse":
      return en ? "Gentle cleanser" : "Sữa rửa mặt dịu";
    case "moisturize":
      if (calm) {
        return en ? "Soothing moisturizer" : "Kem dưỡng làm dịu";
      }
      return en ? "Moisturizer" : "Kem dưỡng ẩm";
    case "spf":
      return en ? "Morning sunscreen" : "Kem chống nắng";
    case "soothe":
      return en ? "Soothing layer" : "Lớp làm dịu";
    case "treat":
      return en ? "One active (optional)" : "1 hoạt chất (tuỳ chọn)";
    default:
      if (category.trim()) return category.trim();
      return en ? "Product tip" : "Gợi ý sản phẩm";
  }
}

type ScrubKind = "why" | "how" | "caution" | "benefit";

function scrubFallback(kind: ScrubKind, locale: string): string {
  const en = locale.toLowerCase().startsWith("en");
  switch (kind) {
    case "how":
      return en
        ? "Use gently as directed for this step."
        : "Dùng nhẹ theo hướng dẫn cho bước này.";
    case "caution":
      return en
        ? "Stop if irritation increases. Not a prescription."
        : "Ngưng nếu càng kích ứng. Không phải kê đơn.";
    case "benefit":
      return en ? "Supports this care step." : "Hỗ trợ bước chăm sóc này.";
    default:
      return en
        ? "Fits this step for your current skin phase."
        : "Phù hợp bước này theo giai đoạn da hiện tại.";
  }
}

/** Clear affiliate fields for Premium no_ads — keep AM/PM + generic role cards. */
export function stripStarterCommerceForNoAds(
  starter: StarterRoutineDTO,
  locale: string,
): StarterRoutineDTO {
  const guidance = starter.product_guidance?.map((item) => {
    const brand = item.brand?.trim().toLowerCase() ?? "";
    const product = item.product_name?.trim().toLowerCase() ?? "";
    const scrub = (text: string | undefined, kind: ScrubKind) => {
      const t = text?.trim() ?? "";
      if (!t) return "";
      const low = t.toLowerCase();
      if (
        (brand.length >= 3 && low.includes(brand)) ||
        (product.length >= 3 && low.includes(product))
      ) {
        return scrubFallback(kind, locale);
      }
      return t;
    };
    return {
      ...item,
      affiliate_product_id: undefined,
      product_name: undefined,
      brand: undefined,
      affiliate_link: undefined,
      price_range: undefined,
      name_or_category: genericRoleLabel(
        item.step,
        item.category,
        locale,
        item.phase,
      ),
      why: scrub(item.why, "why"),
      how_to_use: scrub(item.how_to_use, "how"),
      caution: scrub(item.caution, "caution") || undefined,
      benefits: (item.benefits ?? [])
        .map((b) => scrub(b, "benefit"))
        .filter(Boolean),
    };
  });
  return {
    ...starter,
    product_suggestions: undefined,
    product_guidance: guidance,
  };
}

/**
 * Welcome starter: Free merges Step-1 analyze commerce; Premium never rehydrates brands.
 */
export function resolveWelcomeStarter(opts: {
  userRoutine: StarterRoutineDTO | null | undefined;
  packStarter: StarterRoutineDTO;
  analysis?: {
    product_guidance?: StarterRoutineDTO["product_guidance"];
    product_suggestions?: StarterRoutineDTO["product_suggestions"];
  } | null;
  noAds: boolean;
  locale: string;
}): StarterRoutineDTO {
  const base = opts.userRoutine ?? opts.packStarter;
  if (opts.noAds) {
    const merged: StarterRoutineDTO = {
      ...base,
      product_guidance:
        opts.packStarter.product_guidance ?? base.product_guidance,
      product_suggestions: opts.packStarter.product_suggestions,
    };
    return stripStarterCommerceForNoAds(merged, opts.locale);
  }
  return withAnalyzeCommerce(base, opts.analysis);
}

/** @deprecated Use buildDefaultStarterRoutine */
export function buildGuestStarterFallback(
  ob: OnboardingState,
  locale: string,
): StarterRoutineDTO {
  return buildDefaultStarterRoutine(ob, locale);
}
