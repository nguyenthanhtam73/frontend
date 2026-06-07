import {
  buildStarterPackBullets,
  type OnboardingState,
} from "@/lib/stores/onboarding-store";
import type { StarterRoutineDTO } from "@/lib/types/starter-routine";

/** Offline fallback when guest preview API is unreachable. */
export function buildGuestStarterFallback(
  ob: OnboardingState,
  locale: string,
): StarterRoutineDTO {
  const bullets = buildStarterPackBullets(ob);
  const isEn = locale === "en";
  const coaching = ob.aiSnapshot?.coaching_notes?.trim() ?? "";

  const morning =
    bullets.length > 0
      ? bullets.slice(0, Math.min(2, bullets.length))
      : isEn
        ? ["Gentle cleanser + moisturizer + SPF in the morning."]
        : ["Sáng: sữa rửa mặt dịu + kem dưỡng ẩm + kem chống nắng."];

  const evening =
    bullets.length > 2
      ? bullets.slice(2, Math.min(4, bullets.length))
      : isEn
        ? ["Evening: cleanse + light moisturizer; add one active only when skin feels calm."]
        : ["Tối: rửa mặt + dưỡng ẩm nhẹ; thêm hoạt chất khi da ổn định."];

  return {
    morning,
    evening,
    week_notes: isEn
      ? "This is a local preview on your device — sign up to save it and let the coach remember you."
      : "Đây là bản xem thử trên thiết bị — đăng ký để lưu lại và để coach nhớ bạn lâu dài.",
    safety_notes: isEn
      ? "General skincare guidance only — not a substitute for medical advice."
      : "Chỉ là gợi ý chăm sóc da chung — không thay thế tư vấn y tế.",
    encouragement: isEn
      ? "You finished getting-to-know-your-skin — nice work taking that first step."
      : "Bạn vừa hoàn thành phần làm quen với da — bước đầu rất đáng khen.",
    skin_readback: coaching,
    rationale: bullets.join("\n"),
    closing_reminder: isEn
      ? "Sign up to keep this routine and your skin history in one place."
      : "Đăng ký để giữ routine này và lịch sử da ở một chỗ nhé.",
  };
}
