import { inferSkinTypeFromConcerns } from "@/lib/onboarding/infer-skin-type";
import type { OnboardingState, SkinGoal } from "@/lib/stores/onboarding-store";

export type RoutineRationaleSource = "ai" | "manual";

export type RoutineRationale = {
  lines: string[];
  source: RoutineRationaleSource;
  skinType: string;
  goal: string;
  concerns: string[];
};

type LabelFn = (key: string) => string;

const GOAL_FOCUS_VI: Record<SkinGoal, string> = {
  glow: "làm da sáng khoẻ và đều màu",
  clear_acne: "giảm mụn và giữ da sạch, thoáng",
  barrier: "làm dịu và phục hồi lớp bảo vệ da",
  anti_aging: "cấp ẩm sâu và bảo vệ da khỏi lão hoá sớm",
  unsure: "xây nền tảng chăm da an toàn, dễ duy trì",
};

const GOAL_FOCUS_EN: Record<SkinGoal, string> = {
  glow: "a healthy glow and more even tone",
  clear_acne: "clearer skin with fewer breakouts",
  barrier: "soothing and repairing your skin barrier",
  anti_aging: "deep hydration and early anti-aging protection",
  unsure: "a safe, easy-to-stick-with skincare base",
};

const CONCERN_PHRASE_VI: Record<string, string> = {
  acne: "mụn",
  dryness: "khô",
  redness: "đỏ / dễ kích ứng",
  hyperpigmentation: "thâm / sạm",
  dullness: "xỉn màu",
  large_pores: "lỗ chân lông to",
  weak_barrier: "lớp bảo vệ da yếu",
  dehydration: "thiếu ẩm",
};

const CONCERN_PHRASE_EN: Record<string, string> = {
  acne: "breakouts",
  dryness: "dryness",
  redness: "redness / sensitivity",
  hyperpigmentation: "dark spots",
  dullness: "dullness",
  large_pores: "visible pores",
  weak_barrier: "a weakened barrier",
  dehydration: "dehydration",
};

function joinConcerns(concerns: string[], locale: string, max = 3): string {
  const map = locale === "en" ? CONCERN_PHRASE_EN : CONCERN_PHRASE_VI;
  const labels = concerns.slice(0, max).map((c) => map[c] ?? c);
  if (labels.length === 0) return locale === "en" ? "your main concerns" : "các vấn đề bạn chọn";
  if (locale === "en") {
    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
    return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
  }
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} và ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} và ${labels[labels.length - 1]}`;
}

function skinTypeLabel(
  skinType: string,
  locale: string,
  t: LabelFn,
): string {
  const key = `skinType.${skinType}`;
  try {
    return t(key);
  } catch {
    return skinType;
  }
}

function goalLabel(goal: SkinGoal, locale: string, t: LabelFn): string {
  try {
    return t(`goal.${goal}`);
  } catch {
    return goal;
  }
}

/** 2–4 lines explaining why this routine fits the user's profile. */
export function buildRoutineRationale(
  ob: OnboardingState,
  locale: string,
  t: LabelFn,
): RoutineRationale {
  const en = locale === "en";
  const concerns = ob.aiConcernTags;
  const goal = ob.goal ?? "unsure";
  const skinType =
    ob.skinType ?? inferSkinTypeFromConcerns(concerns, ob.goal);
  const skinLabel = skinTypeLabel(skinType, locale, t);
  const goalText = goalLabel(goal as SkinGoal, locale, t);
  const concernText = joinConcerns(concerns, locale);
  const goalFocus = en ? GOAL_FOCUS_EN[goal as SkinGoal] : GOAL_FOCUS_VI[goal as SkinGoal];
  const source: RoutineRationaleSource = ob.aiSnapshot ? "ai" : "manual";

  const lines: string[] = [];

  if (source === "ai") {
    lines.push(
      en
        ? `This routine targets ${goalFocus}, based on your photos and the concerns you picked.`
        : `Routine này tập trung vào ${goalFocus}, dựa trên ảnh bạn chụp và các vấn đề đã chọn.`,
    );
    const barrier = ob.aiSnapshot?.barrier_signal;
    if (barrier === "possibly_compromised") {
      lines.push(
        en
          ? `We kept steps gentle because your skin may need extra soothing right now.`
          : `Các bước được giữ nhẹ nhàng vì da bạn có thể đang cần làm dịu thêm.`,
      );
    } else if (ob.aiSnapshot?.coaching_notes?.trim()) {
      const snippet = ob.aiSnapshot.coaching_notes.trim().split(/[.!?]/)[0];
      if (snippet && snippet.length > 20 && snippet.length < 160) {
        lines.push(snippet + (snippet.endsWith(".") ? "" : "."));
      }
    }
  } else {
    lines.push(
      en
        ? `This starter routine focuses on ${goalFocus} for ${skinLabel.toLowerCase()} skin with ${concernText}.`
        : `Routine khởi đầu này tập trung vào ${goalFocus} cho da ${skinLabel.toLowerCase()} — bạn đang gặp ${concernText}.`,
    );
  }

  lines.push(
    en
      ? `Morning: cleanse → hydrate → SPF. Evening: remove the day gently, then repair overnight.`
      : `Sáng: rửa mặt → cấp ẩm → chống nắng. Tối: làm sạch nhẹ nhàng rồi phục hồi qua đêm.`,
  );

  if (goal === "barrier" || concerns.includes("redness") || concerns.includes("dryness")) {
    lines.push(
      en
        ? `We avoided harsh actives so your barrier can recover before adding stronger steps.`
        : `Routine tránh hoạt chất mạnh để da kịp phục hồi trước khi thêm bước nâng cao.`,
    );
  } else if (goal === "clear_acne" || concerns.includes("acne")) {
    lines.push(
      en
        ? `Spot treatments are optional — only when skin feels calm, never on irritated areas.`
        : `Chấm mụn chỉ khi da ổn định — không dùng trên vùng đang đỏ hoặc kích ứng.`,
    );
  } else {
    lines.push(
      en
        ? `Your goal "${goalText}" guided which steps we prioritized first.`
        : `Mục tiêu "${goalText}" là kim chỉ nam cho các bước được ưu tiên.`,
    );
  }

  return {
    lines: lines.slice(0, 4),
    source,
    skinType,
    goal,
    concerns,
  };
}
