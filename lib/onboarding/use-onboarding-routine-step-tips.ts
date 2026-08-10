"use client";

import { useLocale } from "next-intl";
import { useMemo } from "react";

import {
  attachGuidanceToRoutineSteps,
  countRoutineAffiliateCtas,
  type RoutineStepProductTip,
} from "@/lib/onboarding/attach-guidance-to-routine";
import { enrichProductGuidanceItems } from "@/lib/onboarding/enrich-product-guidance";
import {
  filterGuidanceForPhase,
  resolveStarterCarePhase,
  type StarterCarePhase,
} from "@/lib/onboarding/guest-starter";
import { useManualProductGuidance } from "@/lib/onboarding/use-manual-product-guidance";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import type { StarterRoutineDTO } from "@/lib/types/starter-routine";

export type OnboardingRoutineStepTips = {
  routine: StarterRoutineDTO | null;
  carePhase: StarterCarePhase;
  stepTips: {
    morning: (RoutineStepProductTip | null)[];
    evening: (RoutineStepProductTip | null)[];
  };
  affiliateCtaCount: number;
  /** Phase-filtered guidance items (for care-note / no-pick checks). */
  guidanceItems: ReturnType<typeof filterGuidanceForPhase>;
};

/**
 * Same AM/PM product tips (why / help / soft / Shopee) used on Step 2 —
 * shared so Step 3 ready recap can match.
 */
export function useOnboardingRoutineStepTips(): OnboardingRoutineStepTips {
  const locale = useLocale();
  const routine = useOnboardingStore((s) => s.starterRoutine);
  const aiSnapshot = useOnboardingStore((s) => s.aiSnapshot);
  const aiConcernTags = useOnboardingStore((s) => s.aiConcernTags);
  const goal = useOnboardingStore((s) => s.goal);
  const skinType = useOnboardingStore((s) => s.skinType);

  const carePhase = useMemo(
    () =>
      resolveStarterCarePhase({
        aiSnapshot,
        aiConcernTags,
        goal,
        skinType,
      } as Parameters<typeof resolveStarterCarePhase>[0]),
    [aiSnapshot, aiConcernTags, goal, skinType],
  );

  const fromPhotos =
    aiSnapshot?.product_guidance?.length
      ? aiSnapshot.product_guidance
      : routine?.product_guidance?.length
        ? routine.product_guidance
        : undefined;

  const manualGuidance = useManualProductGuidance({
    enabled: !fromPhotos,
    locale,
    goal,
    skinType,
    concerns: aiConcernTags,
  });

  const guidanceItems = useMemo(
    () =>
      filterGuidanceForPhase(
        fromPhotos ?? manualGuidance.result?.product_guidance,
        carePhase,
      ),
    [fromPhotos, manualGuidance.result, carePhase],
  );

  const enrichedGuidance = useMemo(
    () =>
      enrichProductGuidanceItems(guidanceItems, {
        locale,
        phase: carePhase === "manual" ? "calm_first" : carePhase,
        severity:
          typeof aiSnapshot?.severity_level === "string"
            ? aiSnapshot.severity_level
            : undefined,
        regions: aiSnapshot?.primary_regions,
        concerns: aiConcernTags,
      }),
    [guidanceItems, locale, carePhase, aiSnapshot, aiConcernTags],
  );

  const stepTips = useMemo(() => {
    if (!routine) {
      return {
        morning: [] as (RoutineStepProductTip | null)[],
        evening: [] as (RoutineStepProductTip | null)[],
      };
    }
    return attachGuidanceToRoutineSteps(
      routine.morning,
      routine.evening,
      enrichedGuidance,
      carePhase === "manual" ? "calm_first" : carePhase,
      {
        locale,
        phase: carePhase === "manual" ? "calm_first" : carePhase,
        severity:
          typeof aiSnapshot?.severity_level === "string"
            ? aiSnapshot.severity_level
            : undefined,
        regions: aiSnapshot?.primary_regions,
        concerns: aiConcernTags,
        skinType: skinType ?? undefined,
      },
    );
  }, [routine, enrichedGuidance, carePhase, locale, aiSnapshot, aiConcernTags, skinType]);

  const affiliateCtaCount = useMemo(
    () => countRoutineAffiliateCtas(stepTips),
    [stepTips],
  );

  return { routine, carePhase, stepTips, affiliateCtaCount, guidanceItems };
}
