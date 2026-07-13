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
        ? ["Gel or foaming cleanser — 30s, lukewarm water.", "Light oil-free moisturizer — thin layer.", "Broad-spectrum SPF 30+ — reapply if outdoors."]
        : ["Sữa rửa mặt gel/bọt — 30 giây, nước ấm.", "Kem dưỡng oil-free nhẹ — một lớp mỏng.", "Kem chống nắng SPF 30+ — bôi lại nếu ra ngoài nhiều."]
      : skin === "dry"
        ? en
          ? ["Cream cleanser — no tight feeling after.", "Hydrating serum or essence — pat in gently.", "Rich moisturizer + SPF 30+ — don't skip SPF."]
          : ["Sữa rửa mặt dạng kem — rửa xong không căng.", "Serum/essence cấp ẩm — vỗ nhẹ cho thấm.", "Kem dưỡng ẩm đặc + SPF 30+ — không bỏ qua chống nắng."]
        : skin === "sensitive"
          ? en
            ? ["Fragrance-free gentle cleanser — lukewarm water.", "Simple moisturizer for sensitive skin.", "Mineral SPF 30+ — patch test first."]
            : ["Sữa rửa mặt không mùi, dịu — nước ấm.", "Kem dưỡng tối giản cho da nhạy cảm.", "Kem chống nắng khoáng SPF 30+ — patch test trước."]
          : en
            ? ["Gentle pH-balanced cleanser — 30 seconds.", "Light moisturizer — while skin is still damp.", "Daily SPF 30+ — even near windows."]
            : ["Sữa rửa mặt pH cân bằng, dịu — 30 giây.", "Kem dưỡng ẩm nhẹ — khi da còn ẩm.", "Kem chống nắng SPF 30+ hàng ngày — kể cả ở nhà gần cửa sổ."];

  if (goal === "clear_acne") {
    base.push(
      en
        ? "If skin feels calm: spot treatment on active breakouts only."
        : "Nếu da ổn: chấm điều trị mụn chỉ lên nốt đang viêm.",
    );
  } else if (goal === "barrier") {
    base.push(
      en
        ? "Skip strong acids until skin feels comfortable again."
        : "Tạm bỏ acid mạnh cho đến khi da hết căng/kích ứng.",
    );
  } else if (goal === "glow") {
    base.push(
      en
        ? "Optional: vitamin C in the morning — one new product per week."
        : "Tuỳ chọn: vitamin C buổi sáng — mỗi tuần chỉ thêm 1 sản phẩm mới.",
    );
  } else if (goal === "anti_aging") {
    base.push(
      en
        ? "SPF is your best anti-aging step — keep it daily."
        : "Kem chống nắng là bước chống lão hoá quan trọng nhất — dùng đều.",
    );
  }

  return base.slice(0, 4);
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
        ? ["Double cleanse if you wore SPF/makeup.", "Light moisturizer.", "BHA/PHA 2–3×/week only when skin is calm — patch test first."]
        : ["Tẩy trang kép nếu có makeup/SPF.", "Kem dưỡng nhẹ.", "BHA/PHA 2–3 lần/tuần khi da ổn — patch test trước."]
      : skin === "dry"
        ? en
          ? ["Oil or balm cleanse, then gentle second cleanse.", "Hydrating toner/essence.", "Occlusive moisturizer or sleeping mask on dry nights."]
          : ["Tẩy trang dầu/balm, rửa lại nhẹ.", "Toner/essence cấp ẩm.", "Kem dưỡng đặc hoặc sleeping mask khi da khô."]
        : skin === "sensitive"
          ? en
            ? ["Gentle single cleanse.", "Barrier cream (ceramide).", "No new actives this week — calm first."]
            : ["Rửa mặt dịu một bước.", "Kem phục hồi barrier (ceramide).", "Tuần này chưa thêm hoạt chất mới — làm dịu trước."]
          : en
            ? ["Cleanse + remove SPF.", "Moisturizer.", "One active max (e.g. retinol or acid) — not on the same night as a new product."]
            : ["Rửa mặt + tẩy SPF.", "Kem dưỡng ẩm.", "Tối đa 1 hoạt chất (retinol/acid) — không trùng đêm thử sản phẩm mới."];

  if (goal === "clear_acne") {
    lines.unshift(
      en
        ? "Don't pick — cleanse gently and pat dry."
        : "Không nặn mụn — rửa nhẹ và thấm khô.",
    );
  } else if (goal === "barrier") {
    lines.push(
      en
        ? "Focus on repair: ceramide + panthenol layers."
        : "Ưu tiên phục hồi: lớp ceramide + panthenol.",
    );
  }

  return lines.slice(0, 4);
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
        ? "Keep it to 3 morning steps this week — consistency beats complexity."
        : "Tuần này giữ sáng 3 bước — đều đặn quan trọng hơn nhiều bước."
      : ob.skillMode === "advanced"
        ? en
          ? "Track pH and order when layering acids/retinol."
          : "Theo dõi pH và thứ tự khi xen kẽ acid/retinol."
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
