import { buildRoutineRationale } from "@/lib/onboarding/routine-rationale";
import { buildDefaultStarterRoutine } from "@/lib/onboarding/guest-starter";
import type { OnboardingState } from "@/lib/stores/onboarding-store";
import type { StarterRoutineDTO } from "@/lib/types/starter-routine";

type LabelFn = (key: string) => string;

/** Build or refresh the step-2 starter routine from current onboarding answers. */
export function buildStepStarterRoutine(
  ob: OnboardingState,
  locale: string,
  t?: LabelFn,
): StarterRoutineDTO {
  const base = buildDefaultStarterRoutine(ob, locale);
  const coaching = ob.aiSnapshot?.coaching_notes?.trim();
  const rationaleBlock = t
    ? buildRoutineRationale(ob, locale, t)
    : null;

  const rationaleText = rationaleBlock
    ? [rationaleBlock.headline, ...rationaleBlock.lines].join("\n")
    : locale === "en"
      ? "Built from your skin goal and main concerns — a safe base to start."
      : "Tạo từ mục tiêu da và vấn đề bạn chọn — nền tảng an toàn để bắt đầu.";

  const encouragement =
    ob.aiSnapshot != null
      ? locale === "en"
        ? "Starter from your photos and goals — tweak any step below."
        : "Gợi ý ban đầu từ ảnh và mục tiêu — chỉnh từng bước bên dưới thoải mái."
      : locale === "en"
        ? "Starter from your goals and concerns — not a photo-based routine."
        : "Gợi ý ban đầu từ mục tiêu và vấn đề bạn chọn — chưa dựa trên ảnh.";

  return {
    ...base,
    skin_readback: coaching || base.skin_readback,
    rationale: rationaleText,
    encouragement,
    closing_reminder:
      locale === "en"
        ? "You can edit any step below — or change everything later in your routine page."
        : "Bạn có thể chỉnh từng bước bên dưới — hoặc đổi hoàn toàn sau này trong trang Routine.",
  };
}
