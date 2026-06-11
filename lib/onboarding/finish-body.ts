import { ONBOARDING_DEFAULT_BUDGET } from "@/lib/onboarding/constants";
import type { OnboardingState } from "@/lib/stores/onboarding-store";
import type { OnboardingSkinAnalyzeDTO } from "@/lib/types/onboarding-ai";

/** Body for POST /profile/onboarding/complete and /onboarding/preview-complete. */
export type OnboardingFinishBody = {
  skin_type: string;
  undertone: string;
  contexts: string[];
  budget: string;
  goal: string;
  skill_level: string;
  body_concerns: string[];
  current_routine: string;
  locale: string;
  photos_skipped?: boolean;
  skin_analysis?: OnboardingSkinAnalyzeDTO;
};

export function bodyConcernsFromStore(ob: OnboardingState): string[] {
  const manual = ob.bodyConcernsText
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([...ob.aiConcernTags, ...manual])];
}

export function buildOnboardingFinishBody(
  ob: OnboardingState,
  locale: string,
  photosSkipped: boolean,
): OnboardingFinishBody | null {
  const bodyConcerns = bodyConcernsFromStore(ob);
  if (!ob.skinType || !ob.goal || !ob.skillMode || bodyConcerns.length === 0) {
    return null;
  }

  const body: OnboardingFinishBody = {
    skin_type: ob.skinType,
    undertone: ob.undertone ?? "prefer_not",
    contexts: [],
    budget: ONBOARDING_DEFAULT_BUDGET,
    goal: ob.goal,
    skill_level: ob.skillMode,
    body_concerns: bodyConcerns,
    current_routine: ob.currentRoutineText.trim(),
    locale,
    photos_skipped: photosSkipped,
  };

  if (ob.aiSnapshot) {
    body.skin_analysis = ob.aiSnapshot;
  }

  return body;
}
