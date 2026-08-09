import { resolveStarterCarePhase } from "@/lib/onboarding/guest-starter";
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
  dryness: "da khô",
  redness: "dễ đỏ / kích ứng",
  hyperpigmentation: "thâm / sạm",
  dullness: "xỉn màu",
  large_pores: "lỗ chân lông to",
  weak_barrier: "da dễ đỏ / yếu hơn bình thường",
  dehydration: "thiếu ẩm",
};

const CONCERN_PHRASE_EN: Record<string, string> = {
  acne: "breakouts",
  dryness: "dryness",
  redness: "redness",
  hyperpigmentation: "dark spots",
  dullness: "dullness",
  large_pores: "visible pores",
  weak_barrier: "skin that gets irritated easily",
  dehydration: "dehydrated-feeling skin",
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

/** Avoid "da da hỗn hợp" when i18n label already starts with "Da ". */
function skinPhrase(skinLabel: string, en: boolean): string {
  const trimmed = skinLabel.trim();
  if (!trimmed) return en ? "your skin" : "da bạn";
  if (en) {
    const low = trimmed.toLowerCase();
    return low.endsWith("skin") ? low : `${low} skin`;
  }
  // VI labels are like "Da hỗn hợp" — don't prefix another "da".
  if (/^da\b/i.test(trimmed)) return trimmed.toLowerCase();
  return `da ${trimmed.toLowerCase()}`;
}

function regionPhrase(
  regions: string[] | undefined,
  en: boolean,
): string | null {
  if (!regions?.length) return null;
  const map: Record<string, { en: string; vi: string }> = {
    cheeks: { en: "cheeks", vi: "má" },
    t_zone: { en: "T-zone", vi: "vùng chữ T" },
    forehead: { en: "forehead", vi: "trán" },
    chin: { en: "chin", vi: "cằm" },
    nose: { en: "nose", vi: "mũi" },
    jaw: { en: "jaw", vi: "hàm" },
  };
  const labels = regions.slice(0, 2).map((r) => {
    const key = String(r).toLowerCase();
    const hit = map[key];
    return hit ? (en ? hit.en : hit.vi) : key.replace(/_/g, " ");
  });
  if (!labels.length) return null;
  return en ? labels.join(" & ") : labels.join(" và ");
}

function severityPhrase(
  severity: string | undefined,
  en: boolean,
): string | null {
  const s = String(severity ?? "").toLowerCase();
  if (s === "dense") return en ? "dense / very visible" : "dày / rõ";
  if (s === "moderate") return en ? "moderate" : "vừa";
  if (s === "mild") return en ? "mild" : "nhẹ";
  return null;
}

/** 1–3 tight lines explaining why this routine fits the user's profile. */
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
  const phase = resolveStarterCarePhase(ob);
  const skin = skinPhrase(skinLabel, en);

  let headline: string;
  const lines: string[] = [];

  if (source === "ai") {
    const summary = ob.aiSnapshot?.summary?.trim();
    const regions = regionPhrase(ob.aiSnapshot?.primary_regions, en);
    const sev = severityPhrase(
      typeof ob.aiSnapshot?.severity_level === "string"
        ? ob.aiSnapshot.severity_level
        : undefined,
      en,
    );

    if (summary) {
      headline = summary.length > 160 ? `${summary.slice(0, 157).trim()}…` : summary;
    } else {
      headline = en
        ? `From your photos: ${skin}, focused on ${goalText.toLowerCase()}.`
        : `Từ ảnh của bạn: ${skin}, ưu tiên ${goalText.toLowerCase()}.`;
    }

    if (regions || sev) {
      lines.push(
        en
          ? `Focus${regions ? ` on ${regions}` : ""}${sev ? ` · ${sev}` : ""} — matched to what the photos show.`
          : `Ưu tiên${regions ? ` vùng ${regions}` : ""}${sev ? ` · mức ${sev}` : ""} — bám theo ảnh vừa phân tích.`,
      );
    }

    if (phase === "calm_first") {
      lines.push(
        en
          ? "Morning: cleanse → moisturize → SPF. Evening: gentle cleanse → repair — no strong actives yet."
          : "Sáng: sạch → ẩm → SPF. Tối: sạch nhẹ → phục hồi — chưa thêm hoạt chất mạnh.",
      );
    } else if (phase === "can_add_active") {
      lines.push(
        en
          ? "Morning: cleanse → moisturize → SPF. Evening: cleanse → at most one active → moisturize."
          : "Sáng: sạch → ẩm → SPF. Tối: sạch → tối đa 1 hoạt chất → dưỡng ẩm.",
      );
    } else {
      lines.push(
        en
          ? `Built around ${concernText} and your goal, with daily sunscreen as the anchor.`
          : `Routine xoay quanh ${concernText} và mục tiêu của bạn, với kem chống nắng là trụ cột.`,
      );
    }
  } else {
    headline = en
      ? `Built for ${skin} aiming for ${goalText.toLowerCase()}.`
      : `Tạo cho ${skin}, hướng tới ${goalText.toLowerCase()}.`;

    lines.push(
      en
        ? `You told us about ${concernText} — these steps address that first.`
        : `Bạn chọn ${concernText} — các bước này ưu tiên xử lý trước.`,
    );

    if (goal === "barrier" || concerns.includes("redness") || concerns.includes("dryness")) {
      lines.push(
        en
          ? "Morning: cleanse → moisturize → SPF. Evening: gentle cleanse → repair — no acids yet."
          : "Sáng: sạch → ẩm → SPF. Tối: sạch nhẹ → phục hồi — chưa dùng acid.",
      );
    } else if (goal === "clear_acne" || concerns.includes("acne")) {
      lines.push(
        en
          ? "Morning: cleanse → moisturize → SPF. Evening: cleanse → repair — calm first this week."
          : "Sáng: sạch → ẩm → SPF. Tối: sạch → phục hồi — tuần này ưu tiên làm dịu.",
      );
    } else {
      lines.push(
        en
          ? "A simple AM/PM base you can stick to this week."
          : "Nền sáng/tối đơn giản — dễ duy trì ngay tuần này.",
      );
    }
  }

  return {
    headline,
    lines: lines.map((l) => l.trim()).filter(Boolean).slice(0, 3),
    source,
    skinType,
    goal,
    concerns,
  };
}
