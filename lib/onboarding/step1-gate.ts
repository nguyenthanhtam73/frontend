import {
  MANUAL_QUICK_SKIN_TYPES,
  ONBOARDING_MIN_PHOTOS,
} from "@/lib/onboarding/constants";
import type {
  SkinInputMode,
  SkinTypeCard,
} from "@/lib/stores/onboarding-store";

/** The 5 types users confirm/override — not prefer_not. */
export function isQuickSkinType(
  value: SkinTypeCard | string | null | undefined,
): value is SkinTypeCard {
  return (
    typeof value === "string" &&
    (MANUAL_QUICK_SKIN_TYPES as readonly string[]).includes(value)
  );
}

export type Step1GateInput = {
  hasGoal: boolean;
  concernCount: number;
  skipFace: boolean;
  photoCount: number;
  hasAiSnapshot: boolean;
  analyzing: boolean;
  skinType: SkinTypeCard | null;
  skinInputMode: SkinInputMode;
};

export function canProceedStep1Basics(input: {
  hasGoal: boolean;
  concernCount: number;
}): boolean {
  return input.hasGoal && input.concernCount >= 1;
}

/** Photos are staged and we still need a successful analyze-skin call. */
export function shouldRunAnalyze(input: {
  skipFace: boolean;
  photoCount: number;
  hasAiSnapshot: boolean;
  analyzing?: boolean;
}): boolean {
  return (
    !input.skipFace &&
    input.photoCount >= ONBOARDING_MIN_PHOTOS &&
    !input.hasAiSnapshot &&
    input.analyzing !== true
  );
}

/** After AI, or after skip-photos / privacy skip — show the 5-type picker. */
export function isStep1SkinTypePickerVisible(input: {
  hasAiSnapshot: boolean;
  skipFace: boolean;
  skinInputMode: SkinInputMode;
}): boolean {
  return (
    input.hasAiSnapshot ||
    input.skipFace ||
    input.skinInputMode === "manual_skip" ||
    input.skinInputMode === "manual_fallback"
  );
}

/**
 * Sticky Continue on step 1.
 * Photos ready → analyze. After AI/skip → need an explicit 5-type pick.
 * No photos yet → first tap is allowed so we can reveal the picker (not a
 * second competing Continue).
 */
export function canContinueStep1(input: Step1GateInput): boolean {
  if (input.analyzing) return false;
  if (!canProceedStep1Basics(input)) return false;
  if (shouldRunAnalyze(input)) return true;
  if (isQuickSkinType(input.skinType)) return true;
  if (
    !isStep1SkinTypePickerVisible(input) &&
    (input.skipFace || input.photoCount < ONBOARDING_MIN_PHOTOS)
  ) {
    return true;
  }
  return false;
}

/** True when Continue should leave step 1 (analyze already done / skipped). */
export function shouldAdvanceFromStep1(input: Step1GateInput): boolean {
  if (!canProceedStep1Basics(input)) return false;
  if (shouldRunAnalyze(input)) return false;
  return isQuickSkinType(input.skinType);
}
