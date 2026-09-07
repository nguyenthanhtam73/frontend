import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildOnboardingFinishBody } from "@/lib/onboarding/finish-body";
import type { OnboardingSkinAnalyzeDTO } from "@/lib/types/onboarding-ai";
import type { OnboardingState } from "@/lib/stores/onboarding-store";

function stubState(partial: Partial<OnboardingState> = {}): OnboardingState {
  return {
    skinType: "combo",
    undertone: "prefer_not",
    budget: null,
    goal: "clear_acne",
    skillMode: "beginner",
    bodyConcernsText: "",
    currentRoutineText: "",
    aiConcernTags: ["acne"],
    aiSnapshot: null,
    photos: [],
    analyzeStatus: "idle",
    analyzeErrorKind: null,
    skinInputMode: "manual_skip",
    starterRoutine: null,
    starterRoutineUserEdited: false,
    starterRoutineAccepted: false,
    completedAt: null,
    ...partial,
  };
}

function snapshot(
  overrides: Partial<OnboardingSkinAnalyzeDTO> = {},
): OnboardingSkinAnalyzeDTO {
  return {
    skin_type_guess: "combo",
    undertone_guess: "neutral",
    concerns: ["acne"],
    suggested_goal: "clear_acne",
    barrier_signal: "likely_ok",
    confidence: 0.8,
    coaching_notes: "Keep it gentle.",
    non_diagnostic: "",
    photo_quality: { sufficient: true, tips: [] },
    model_used: "test",
    severity_level: "mild",
    primary_regions: ["cheeks"],
    phase: "calm_first",
    summary: "Looks combo.",
    ...overrides,
  };
}

describe("buildOnboardingFinishBody", () => {
  it("keeps Darwin skin_analysis fields when photos succeed, even if the user overrides type", () => {
    const snap = snapshot({
      skin_type_guess: "combo",
      morphology_group: "comedones",
      group_confidence: "high",
      needs_more_info: false,
      detailed_observations: "T-zone oil, dry cheeks",
    });
    const body = buildOnboardingFinishBody(
      stubState({
        skinType: "oily",
        skinInputMode: "ai",
        aiSnapshot: snap,
      }),
      "vi",
      false,
    );

    assert.ok(body);
    assert.equal(body!.skin_type, "oily");
    assert.equal(body!.photos_skipped, false);
    assert.deepEqual(body!.skin_analysis, snap);
    assert.equal(body!.skin_analysis?.skin_type_guess, "combo");
    assert.equal(body!.skin_analysis?.morphology_group, "comedones");
  });

  it("omits skin_analysis on the skip-photos path", () => {
    const body = buildOnboardingFinishBody(
      stubState({ skinType: "dry", aiSnapshot: null }),
      "vi",
      true,
    );
    assert.ok(body);
    assert.equal(body!.photos_skipped, true);
    assert.equal(body!.skin_analysis, undefined);
    assert.equal(body!.skin_type, "dry");
  });
});
