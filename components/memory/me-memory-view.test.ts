import assert from "node:assert/strict";
import { describe, it } from "node:test";

import en from "../../messages/en.json";
import vi from "../../messages/vi.json";
import {
  adherenceMessageKey,
  memoryCacheChipVisible,
  memoryCachedSuffixVisible,
  memoryCharCountVisible,
  memoryMonthlyDigestVisible,
  memoryPromptChipVisible,
} from "./me-memory-view.tsx";

describe("memory admin details", () => {
  it("hides the prompt chip, cache chip, character count, cached suffix, and monthly digest from everyone else", () => {
    assert.equal(memoryPromptChipVisible(false, 36), false);
    assert.equal(memoryPromptChipVisible(true, 0), false);
    assert.equal(memoryPromptChipVisible(true, 36), true);

    assert.equal(memoryCacheChipVisible(false, 3600), false);
    assert.equal(memoryCacheChipVisible(true, 0), false);
    assert.equal(memoryCacheChipVisible(true, 3600), true);

    assert.equal(memoryCharCountVisible(false), false);
    assert.equal(memoryCharCountVisible(true), true);

    assert.equal(memoryCachedSuffixVisible(false, true), false);
    assert.equal(memoryCachedSuffixVisible(true, false), false);
    assert.equal(memoryCachedSuffixVisible(true, true), true);

    assert.equal(memoryMonthlyDigestVisible(false, true), false);
    assert.equal(memoryMonthlyDigestVisible(true, false), false);
    assert.equal(memoryMonthlyDigestVisible(true, true), true);
  });
});

describe("memory care sentences", () => {
  it("uses a full sentence for each level and drops an unknown token", () => {
    assert.equal(adherenceMessageKey("moderate"), "moderate");
    assert.equal(adherenceMessageKey("nope"), null);
    assert.equal(vi.meMemory.adherence.strong, "Gần đây bạn chăm da rất đều");
    assert.equal(vi.meMemory.adherence.moderate, "Gần đây bạn chăm da khá đều");
    assert.equal(vi.meMemory.adherence.low, "Gần đây bạn chăm da chưa đều lắm");
    assert.equal(vi.meMemory.adherence.none, "Chưa đủ lần ghi để thấy bạn chăm da đều đến đâu");
    assert.equal(vi.meMemory.previewSub.includes("từng câu khuyên"), true);
    assert.equal(vi.meMemory.previewSub.includes("câu coach"), false);
    assert.equal(vi.meMemory.feedbackCompact, "{helpful} đúng gu · {notHelpful} chưa hợp");
    assert.equal(
      en.meMemory.adherence.moderate,
      "Lately you've been caring for your skin fairly steadily",
    );
  });
});
