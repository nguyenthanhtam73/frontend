import { ONBOARDING_DEFAULT_BUDGET } from "@/lib/onboarding/constants";
import { inferSkinTypeFromConcerns } from "@/lib/onboarding/infer-skin-type";
import type { OnboardingState } from "@/lib/stores/onboarding-store";
import type { OnboardingSkinAnalyzeDTO } from "@/lib/types/onboarding-ai";
import type { StarterRoutineDTO } from "@/lib/types/starter-routine";

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
  /** Present when the user edited AM/PM in step 2 — persisted server-side. */
  morning?: string[];
  evening?: string[];
};

export function bodyConcernsFromStore(ob: OnboardingState): string[] {
  const manual = ob.bodyConcernsText
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return [...new Set([...ob.aiConcernTags, ...manual])];
}

function sanitizeStarterSteps(steps: string[] | undefined): string[] {
  if (!steps?.length) return [];
  return steps.map((s) => s.trim()).filter(Boolean);
}

/**
 * Attach client-edited morning/evening when the user changed step 2.
 * Omit when unedited so the server keeps scaffold + background AI behavior.
 */
export function withEditedStarterSteps(
  body: OnboardingFinishBody,
  ob: OnboardingState,
  routine?: StarterRoutineDTO | null,
): OnboardingFinishBody {
  if (!ob.starterRoutineUserEdited) return body;
  const source = routine ?? ob.starterRoutine;
  if (!source) return body;
  const morning = sanitizeStarterSteps(source.morning);
  const evening = sanitizeStarterSteps(source.evening);
  if (morning.length === 0 && evening.length === 0) return body;
  return { ...body, morning, evening };
}

export function buildOnboardingFinishBody(
  ob: OnboardingState,
  locale: string,
  photosSkipped: boolean,
  routine?: StarterRoutineDTO | null,
): OnboardingFinishBody | null {
  const bodyConcerns = bodyConcernsFromStore(ob);
  const skinType =
    ob.skinType ?? inferSkinTypeFromConcerns(bodyConcerns, ob.goal);
  if (!skinType || !ob.goal || !ob.skillMode || bodyConcerns.length === 0) {
    return null;
  }

  const body: OnboardingFinishBody = {
    skin_type: skinType,
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

  return withEditedStarterSteps(body, ob, routine);
}
