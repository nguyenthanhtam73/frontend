import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { MANUAL_QUICK_SKIN_TYPES } from "@/lib/onboarding/constants";
import {
  canContinueStep1,
  canProceedStep1Basics,
  isQuickSkinType,
  isStep1SkinTypePickerVisible,
  shouldAdvanceFromStep1,
  shouldRunAnalyze,
  type Step1GateInput,
} from "@/lib/onboarding/step1-gate";

const base: Step1GateInput = {
  hasGoal: true,
  concernCount: 1,
  skipFace: false,
  photoCount: 0,
  hasAiSnapshot: false,
  analyzing: false,
  skinType: null,
  skinInputMode: "none",
};

describe("step1-gate", () => {
  it("exposes exactly 5 confirmable skin types", () => {
    assert.equal(MANUAL_QUICK_SKIN_TYPES.length, 5);
    assert.equal(isQuickSkinType("prefer_not"), false);
    assert.equal(isQuickSkinType("combo"), true);
  });

  it("requires goal + at least one concern before Continue", () => {
    assert.equal(canProceedStep1Basics({ hasGoal: false, concernCount: 1 }), false);
    assert.equal(canProceedStep1Basics({ hasGoal: true, concernCount: 0 }), false);
    assert.equal(canProceedStep1Basics({ hasGoal: true, concernCount: 1 }), true);
  });

  it("runs analyze when 2+ photos are staged and there is no snapshot", () => {
    assert.equal(
      shouldRunAnalyze({ skipFace: false, photoCount: 2, hasAiSnapshot: false }),
      true,
    );
    assert.equal(
      shouldRunAnalyze({ skipFace: false, photoCount: 1, hasAiSnapshot: false }),
      false,
    );
    assert.equal(
      shouldRunAnalyze({ skipFace: true, photoCount: 2, hasAiSnapshot: false }),
      false,
    );
    assert.equal(
      shouldRunAnalyze({ skipFace: false, photoCount: 2, hasAiSnapshot: true }),
      false,
    );
  });

  it("shows the picker after AI or skip-photos, not on the empty photo form", () => {
    assert.equal(
      isStep1SkinTypePickerVisible({
        hasAiSnapshot: false,
        skipFace: false,
        skinInputMode: "none",
      }),
      false,
    );
    assert.equal(
      isStep1SkinTypePickerVisible({
        hasAiSnapshot: true,
        skipFace: false,
        skinInputMode: "ai",
      }),
      true,
    );
    assert.equal(
      isStep1SkinTypePickerVisible({
        hasAiSnapshot: false,
        skipFace: true,
        skinInputMode: "none",
      }),
      true,
    );
    assert.equal(
      isStep1SkinTypePickerVisible({
        hasAiSnapshot: false,
        skipFace: false,
        skinInputMode: "manual_skip",
      }),
      true,
    );
  });

  it("lets first Continue with no photos reveal the picker, then requires a pick", () => {
    assert.equal(canContinueStep1(base), true);
    assert.equal(shouldAdvanceFromStep1(base), false);

    const pickerOpen: Step1GateInput = {
      ...base,
      skinInputMode: "manual_skip",
    };
    assert.equal(canContinueStep1(pickerOpen), false);
    assert.equal(shouldAdvanceFromStep1(pickerOpen), false);

    const picked: Step1GateInput = {
      ...pickerOpen,
      skinType: "oily",
    };
    assert.equal(canContinueStep1(picked), true);
    assert.equal(shouldAdvanceFromStep1(picked), true);
  });

  it("after AI: Continue is enabled with the preselected guess and does not re-analyze", () => {
    const afterAi: Step1GateInput = {
      ...base,
      photoCount: 2,
      hasAiSnapshot: true,
      skinType: "combo",
      skinInputMode: "ai",
    };
    assert.equal(shouldRunAnalyze(afterAi), false);
    assert.equal(canContinueStep1(afterAi), true);
    assert.equal(shouldAdvanceFromStep1(afterAi), true);
  });

  it("does not treat prefer_not as a confirmed 5-type pick", () => {
    const preferNot: Step1GateInput = {
      ...base,
      hasAiSnapshot: true,
      skinType: "prefer_not",
      skinInputMode: "ai",
    };
    assert.equal(canContinueStep1(preferNot), false);
    assert.equal(shouldAdvanceFromStep1(preferNot), false);
  });
});
