import { inferSkinTypeFromConcerns } from "@/lib/onboarding/infer-skin-type";
import type { OnboardingState, SkinGoal } from "@/lib/stores/onboarding-store";

export type RoutineRationaleSource = "ai" | "manual";

export type RoutineRationale = {
  /** One-line punchy opener shown prominently. */
  headline: string;
  lines: string[];
  source: RoutineRationaleSource;
  skinType: string;
  goal: string;
  concerns: string[];
};

type LabelFn = (key: string) => string;

const CONCERN_PHRASE_VI: Record<string, string> = {
  acne: "mụn",
  dryness: "khô",
  redness: "dễ đỏ / kích ứng",
  hyperpigmentation: "thâm / sạm",
  dullness: "xỉn màu",
  large_pores: "lỗ chân lông to",
  weak_barrier: "barrier yếu",
  dehydration: "thiếu ẩm",
};

const CONCERN_PHRASE_EN: Record<string, string> = {
  acne: "breakouts",
  dryness: "dryness",
  redness: "redness",
  hyperpigmentation: "dark spots",
  dullness: "dullness",
  large_pores: "visible pores",
  weak_barrier: "a weak barrier",
  dehydration: "dehydration",
};

function joinConcerns(concerns: string[], locale: string, max = 3): string {
  const map = locale === "en" ? CONCERN_PHRASE_EN : CONCERN_PHRASE_VI;
  const labels = concerns.slice(0, max).map((c) => map[c] ?? c);
  if (labels.length === 0) {
    return locale === "en" ? "your concerns" : "vấn đề bạn chọn";
  }
  if (locale === "en") {
    if (labels.length === 1) return labels[0];
    if (labels.length === 2) return `${labels[0]} and ${labels[1]}`;
    return `${labels.slice(0, -1).join(", ")}, and ${labels[labels.length - 1]}`;
  }
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} và ${labels[1]}`;
  return `${labels.slice(0, -1).join(", ")} và ${labels[labels.length - 1]}`;
}

function skinTypeLabel(skinType: string, t: LabelFn): string {
  try {
    return t(`skinType.${skinType}`);
  } catch {
    return skinType;
  }
}

function goalLabel(goal: SkinGoal, t: LabelFn): string {
  try {
    return t(`goal.${goal}`);
  } catch {
    return goal;
  }
}

function barrierPhrase(signal: string | undefined, en: boolean): string | null {
  if (signal === "possibly_compromised") {
    return en
      ? "your barrier may need extra soothing"
      : "lớp bảo vệ da có thể đang cần làm dịu";
  }
  if (signal === "likely_ok") {
    return en ? "your barrier looks fairly steady" : "lớp bảo vệ da có vẻ ổn định";
  }
  return null;
}

/** 2–4 tight lines explaining why this routine fits the user's profile. */
export function buildRoutineRationale(
  ob: OnboardingState,
  locale: string,
  t: LabelFn,
): RoutineRationale {
  const en = locale === "en";
  const concerns = ob.aiConcernTags;
  const goal = ob.goal ?? "unsure";
  const skinType = ob.skinType ?? inferSkinTypeFromConcerns(concerns, ob.goal);
  const skinLabel = skinTypeLabel(skinType, t);
  const goalText = goalLabel(goal as SkinGoal, t);
  const concernText = joinConcerns(concerns, locale);
  const source: RoutineRationaleSource = ob.aiSnapshot ? "ai" : "manual";

  let headline: string;
  const lines: string[] = [];

  if (source === "ai") {
    const barrier = barrierPhrase(ob.aiSnapshot?.barrier_signal, en);
    headline = en
      ? `From your photos: ${skinLabel.toLowerCase()} skin, focused on ${goalText.toLowerCase()}.`
      : `Từ ảnh của bạn: da ${skinLabel.toLowerCase()}, ưu tiên ${goalText.toLowerCase()}.`;

    if (barrier) {
      lines.push(
        en
          ? `AI noted ${barrier} — steps stay gentle, no harsh actives yet.`
          : `AI ghi nhận ${barrier} — các bước giữ nhẹ, chưa thêm hoạt chất mạnh.`,
      );
    }

    lines.push(
      en
        ? `We built around ${concernText} and your goal, with daily SPF as the anchor.`
        : `Routine xoay quanh ${concernText} và mục tiêu của bạn, với chống nắng là trụ cột.`,
    );

    const confidence = ob.aiSnapshot?.confidence;
    if (confidence != null && confidence >= 0.6) {
      lines.push(
        en
          ? `Morning: cleanse → hydrate → protect. Evening: gentle reset, then repair.`
          : `Sáng: làm sạch → cấp ẩm → bảo vệ. Tối: làm sạch nhẹ, rồi phục hồi.`,
      );
    } else {
      lines.push(
        en
          ? `You can tweak any step below — this is your starting point, not a fixed rule.`
          : `Bạn có thể chỉnh từng bước bên dưới — đây là điểm khởi đầu, không phải quy tắc cứng.`,
      );
    }
  } else {
    headline = en
      ? `Built for ${skinLabel.toLowerCase()} skin aiming for ${goalText.toLowerCase()}.`
      : `Tạo cho da ${skinLabel.toLowerCase()}, hướng tới ${goalText.toLowerCase()}.`;

    lines.push(
      en
        ? `You told us about ${concernText} — these steps address that first.`
        : `Bạn chọn ${concernText} — các bước này ưu tiên xử lý trước.`,
    );

    if (goal === "barrier" || concerns.includes("redness") || concerns.includes("dryness")) {
      lines.push(
        en
          ? `Gentle cleanse + barrier support — no acids until skin feels calm.`
          : `Rửa mặt dịu + hỗ trợ barrier — chưa dùng acid khi da còn căng/kích ứng.`,
      );
    } else if (goal === "clear_acne" || concerns.includes("acne")) {
      lines.push(
        en
          ? `Oil control without stripping — spot treat only when skin is settled.`
          : `Kiểm soát dầu không làm khô căng — chấm mụn chỉ khi da đã ổn.`,
      );
    } else {
      lines.push(
        en
          ? `A simple AM/PM base you can stick to this week.`
          : `Nền sáng/tối đơn giản — dễ duy trì ngay tuần này.`,
      );
    }

    lines.push(
      en
        ? `SPF every morning — even indoors near windows.`
        : `Chống nắng mỗi sáng — kể cả ở nhà gần cửa sổ.`,
    );
  }

  return {
    headline,
    lines: lines.slice(0, 3),
    source,
    skinType,
    goal,
    concerns,
  };
}
