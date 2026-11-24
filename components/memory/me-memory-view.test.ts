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

function collectStrings(value: unknown, path: string, out: { path: string; text: string }[]) {
  if (typeof value === "string") {
    out.push({ path, text: value });
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    collectStrings(child, `${path}.${key}`, out);
  }
}

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
    assert.equal(vi.meMemory.adherence.strong, "Gần đây mày chăm da rất đều");
    assert.equal(vi.meMemory.adherence.moderate, "Gần đây mày chăm da khá đều");
    assert.equal(vi.meMemory.adherence.low, "Gần đây mày chăm da chưa đều lắm");
    assert.equal(vi.meMemory.adherence.none, "Chưa đủ lần ghi để thấy mày chăm da đều đến đâu");
    assert.equal(vi.meMemory.previewSub.includes("từng câu khuyên"), true);
    assert.equal(vi.meMemory.feedbackCompact, "{helpful} đúng gu · {notHelpful} chưa hợp");
    assert.equal(vi.meMemory.footerNote.startsWith("Dữ liệu này là của riêng mày"), true);
    assert.equal(vi.meMemory.sections.feedback, "Góp ý");
    const lines: { path: string; text: string }[] = [];
    collectStrings(vi.meMemory, "meMemory", lines);
    collectStrings(vi.metadata.meMemory, "metadata.meMemory", lines);
    const hits = lines.filter((line) => /\bbạn\b|\bmình\b|coach/i.test(line.text));
    assert.deepEqual(
      hits.map((line) => `${line.path}: ${line.text}`),
      [],
    );
    const shared = [
      vi.meMemory.title,
      vi.meMemory.sub,
      vi.meMemory.previewTitle,
      vi.meMemory.previewSub,
      vi.meMemory.footerNote,
      vi.meMemory.sections.feedback,
      vi.meMemory.emptyMemory,
    ].join("\n");
    const may = (text: string) => text.match(/mày/gi)?.length ?? 0;
    for (const line of Object.values(vi.meMemory.adherence)) {
      assert.ok(may(`${shared}\n${line}`) <= 2, line);
    }
    assert.equal(
      en.meMemory.adherence.moderate,
      "Lately you've been caring for your skin fairly steadily",
    );
  });
});
