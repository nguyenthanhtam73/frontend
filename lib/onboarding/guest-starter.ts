import {
  buildStarterPackBullets,
  type OnboardingState,
  type SkinGoal,
  type SkinTypeCard,
} from "@/lib/stores/onboarding-store";
import type { StarterRoutineDTO } from "@/lib/types/starter-routine";

function isEn(locale: string) {
  return locale === "en";
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
            "Gel cleanser — clears oil without scrubbing hard.",
            "Light oil-free moisturizer — a thin layer keeps skin comfortable.",
            "Morning sunscreen — protects even if you stay mostly indoors.",
          ]
        : [
            "Sữa rửa mặt dạng gel — làm sạch dầu, không chà mạnh.",
            "Kem dưỡng nhẹ không dầu — một lớp mỏng cho da đỡ bóng mà vẫn êm.",
            "Kem chống nắng buổi sáng — bảo vệ da kể cả khi ở nhà gần cửa sổ.",
          ]
      : skin === "dry"
        ? en
          ? [
              "Cream cleanser — wash gently so skin doesn’t feel tight.",
              "Hydrating serum or essence — pat in while skin is still damp.",
              "Rich moisturizer + morning sunscreen — lock in comfort and protect.",
            ]
          : [
              "Sữa rửa mặt dạng kem — rửa nhẹ, xong không bị căng.",
              "Serum/essence cấp ẩm — vỗ nhẹ khi da còn ẩm.",
              "Kem dưỡng ẩm đặc + kem chống nắng — giữ ẩm và bảo vệ mỗi sáng.",
            ]
        : skin === "sensitive"
          ? en
            ? [
                "Fragrance-free gentle cleanser — lukewarm water only.",
                "Simple moisturizer for easily irritated skin — keep the formula short.",
                "Mineral sunscreen — try a little on the jaw first if you’re unsure.",
              ]
            : [
                "Sữa rửa mặt không mùi, dịu — nước ấm là đủ.",
                "Kem dưỡng tối giản cho da dễ kích ứng — công thức ngắn, ít thứ.",
                "Kem chống nắng khoáng — thử ít ở hàm trước nếu bạn hay nhạy.",
              ]
          : en
            ? [
                "Gentle cleanser — about 30 seconds, lukewarm water.",
                "Light moisturizer — while skin is still a bit damp.",
                "Daily morning sunscreen — even near windows at home.",
              ]
            : [
                "Sữa rửa mặt dịu — khoảng 30 giây, nước ấm.",
                "Kem dưỡng ẩm nhẹ — khi da còn hơi ẩm.",
                "Kem chống nắng mỗi sáng — kể cả ở nhà gần cửa sổ.",
              ];

  if (goal === "clear_acne") {
    base.push(
      en
        ? "If skin feels calm: spot treat only on active red bumps."
        : "Nếu da ổn: chỉ chấm lên nốt đỏ đang sưng.",
    );
  } else if (goal === "barrier") {
    base.push(
      en
        ? "Skip strong acids until skin feels comfortable again."
        : "Tạm bỏ acid mạnh cho đến khi da hết căng / dễ đỏ.",
    );
  } else if (goal === "glow") {
    base.push(
      en
        ? "Optional: vitamin C in the morning — add only one new product per week."
        : "Tuỳ chọn: vitamin C buổi sáng — mỗi tuần chỉ thêm 1 sản phẩm mới.",
    );
  } else if (goal === "anti_aging") {
    base.push(
      en
        ? "Morning sunscreen is your best long-term step — keep it daily."
        : "Kem chống nắng mỗi sáng là bước chống lão hoá quan trọng nhất — dùng đều.",
    );
  }

  return base.slice(0, 3);
}

function eveningForProfile(
  skin: SkinTypeCard | null,
  goal: SkinGoal | null,
  locale: string,
): string[] {
  const en = isEn(locale);
  const lines =
    skin === "oily"
      ? en
        ? [
            "Double cleanse if you wore sunscreen or makeup — remove the day gently.",
            "Light moisturizer — enough comfort, not a heavy coat.",
            "Mild exfoliating liquid 2–3×/week only when skin is calm — try a small patch first.",
          ]
        : [
            "Tẩy trang kép nếu có makeup hoặc kem chống nắng — gỡ nhẹ cả ngày.",
            "Kem dưỡng nhẹ — đủ êm, không phủ dày.",
            "Dung dịch tẩy da chết nhẹ 2–3 lần/tuần khi da ổn — thử ít ở vùng nhỏ trước.",
          ]
      : skin === "dry"
        ? en
          ? [
              "Oil or balm cleanse, then a gentle second wash.",
              "Hydrating toner or essence — pat, don’t rub.",
              "Richer moisturizer on dry nights — seal comfort overnight.",
            ]
          : [
              "Tẩy trang dầu/balm, rồi rửa lại nhẹ.",
              "Toner/essence cấp ẩm — vỗ, đừng chà.",
              "Kem dưỡng đặc hơn khi da khô — giữ ẩm qua đêm.",
            ]
        : skin === "sensitive"
          ? en
            ? [
                "Gentle single cleanse — one soft wash is enough.",
                "Soothing moisturizer — calm first when skin feels easily irritated.",
                "No new strong actives this week — let skin settle.",
              ]
            : [
                "Rửa mặt dịu một bước — một lần nhẹ là đủ.",
                "Kem dưỡng làm dịu — ưu tiên khi da dễ đỏ / dễ kích ứng.",
                "Tuần này chưa thêm hoạt chất mạnh — để da ngồi yên trước.",
              ]
          : en
            ? [
                "Cleanse and remove sunscreen.",
                "Moisturizer — simple overnight comfort.",
                "At most one active (retinol or acid) — not on the same night you try a new product.",
              ]
            : [
                "Rửa mặt và gỡ kem chống nắng.",
                "Kem dưỡng ẩm — đủ êm cho đêm.",
                "Tối đa 1 hoạt chất (retinol hoặc acid) — không trùng đêm thử sản phẩm mới.",
              ];

  if (goal === "clear_acne") {
    lines.unshift(
      en
        ? "Don’t pick — cleanse gently and pat dry."
        : "Không nặn mụn — rửa nhẹ và thấm khô.",
    );
  } else if (goal === "barrier") {
    lines.push(
      en
        ? "Focus on soothing layers — comfort before strong actives."
        : "Ưu tiên lớp làm dịu — êm da trước khi thêm hoạt chất mạnh.",
    );
  }

  return lines.slice(0, 3);
}

/** Safe offline routine tailored to skin type + goal + skill. */
export function buildDefaultStarterRoutine(
  ob: OnboardingState,
  locale: string,
): StarterRoutineDTO {
  const bullets = buildStarterPackBullets(ob);
  const en = isEn(locale);
  const coaching = ob.aiSnapshot?.coaching_notes?.trim() ?? "";

  const morning = morningForProfile(ob.skinType, ob.goal, locale);
  const evening = eveningForProfile(ob.skinType, ob.goal, locale);

  const skillNote =
    ob.skillMode === "beginner"
      ? en
        ? "Keep morning to 3 steps this week — consistency beats complexity."
        : "Tuần này giữ sáng 3 bước — đều đặn quan trọng hơn nhiều bước."
      : ob.skillMode === "advanced"
        ? en
          ? "When layering acids/retinol, go slow and note how skin feels the next day."
          : "Khi xen kẽ acid/retinol, đi chậm và ghi lại cảm giác da hôm sau."
        : en
          ? "Journal 5–7 days before changing multiple products."
          : "Ghi nhật ký 5–7 ngày trước khi đổi nhiều sản phẩm cùng lúc.";

  return {
    morning,
    evening,
    week_notes: skillNote,
    safety_notes: en
      ? "General skincare guidance only — not medical advice. Stop and see a dermatologist if burning, swelling, or spreading rash."
      : "Chỉ là gợi ý chăm sóc da chung — không thay thế bác sĩ. Ngừng và đi khám nếu cháy rát, sưng hoặc phát ban lan.",
    encouragement: en
      ? "You're starting with a solid, safe base — small daily steps add up."
      : "Bạn đang bắt đầu với nền tảng an toàn — mỗi ngày một chút là đủ.",
    skin_readback: coaching,
    rationale: bullets[0] ?? "",
    closing_reminder: en
      ? "Start with these steps this week — you can refine as you learn what your skin loves."
      : "Bắt đầu với các bước này tuần này — bạn có thể tinh chỉnh dần khi hiểu da mình hơn.",
  };
}

/** @deprecated Use buildDefaultStarterRoutine */
export function buildGuestStarterFallback(
  ob: OnboardingState,
  locale: string,
): StarterRoutineDTO {
  return buildDefaultStarterRoutine(ob, locale);
}
