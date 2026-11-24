import assert from "node:assert/strict";
import { describe, it } from "node:test";

import en from "../../messages/en.json";
import vi from "../../messages/vi.json";
import {
  adherenceMessageKey,
  displayMemoryText,
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
    assert.equal(
      vi.meMemory.previewSub,
      "Đây là bản tóm tắt hồ sơ da, nhật ký gần đây, góp ý và tủ đồ, không phải chép lại từng lời khuyên.",
    );
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
    assert.equal(
      vi.meMemory.emptyMemory,
      "Tao chưa nhớ gì về mày hết. Soi da vài lần là tao bắt đầu nhớ nha.",
    );
    assert.equal(vi.meMemory.emptyCta, "Soi da ngay");
    const chrome = [
      vi.meMemory.title,
      vi.meMemory.sub,
      vi.meMemory.previewTitle,
      vi.meMemory.previewSub,
      vi.meMemory.footerNote,
      vi.meMemory.sections.feedback,
    ].join("\n");
    const may = (text: string) => text.match(/mày/gi)?.length ?? 0;
    for (const line of Object.values(vi.meMemory.adherence)) {
      assert.ok(may(`${chrome}\n${line}`) <= 2, line);
    }
    assert.ok(may(`${chrome}\n${vi.meMemory.emptyMemory}\n${vi.meMemory.emptyCta}`) <= 2);
    assert.equal(
      en.meMemory.adherence.moderate,
      "Lately you've been caring for your skin fairly steadily",
    );
  });
});

describe("memory prompt guard", () => {
  it("hides prompt leftovers and keeps a real note", () => {
    assert.equal(displayMemoryText("## Da\nDa nhìn chung ổn."), "## Da\nDa nhìn chung ổn.");
    assert.equal(displayMemoryText(""), "");
    assert.equal(displayMemoryText("   "), "");
    assert.equal(displayMemoryText("USER_MEMORY\n## Da\nDa ổn."), "");
    assert.equal(displayMemoryText("No Saved Memory"), "");
    assert.equal(displayMemoryText("Please paraphrase this profile."), "");
    assert.equal(displayMemoryText("TODAY the skin looks calm."), "");
    assert.equal(displayMemoryText("PROFILE"), "");
    assert.equal(displayMemoryText("SKIN PROFILE"), "");
    const mixed = "## PROFILE\nDa ổn.\n\n## Thói quen\nRửa mặt sáng và tối.";
    assert.equal(displayMemoryText(mixed), "## Thói quen\nRửa mặt sáng và tối.");
    assert.equal(displayMemoryText("## Da\nDa nhìn chung ổn, không còn đỏ.").includes("USER_MEMORY"), false);
  });
});
