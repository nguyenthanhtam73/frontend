import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  parseCoachNoteSections,
  pickCoachVerdict,
  previewCoachText,
} from "../../lib/onboarding/coach-notes-sections";
import {
  dedupeConcernIds,
  dedupeConcernLabels,
} from "../../lib/onboarding/dedupe-concerns";
import { safetyNotesToChecklist } from "../../lib/onboarding/safety-checklist";

describe("coach-notes-sections", () => {
  it("splits 4-paragraph coaching notes and picks verdict", () => {
    const text = [
      "Trên ảnh tao thấy má mày đang đỏ sưng khá rõ.",
      "Tóm lại da mày đang nhạy cảm, tone ấm — ưu tiên làm dịu.",
      "Mày ơi, tuần này đừng trị mạnh.",
      "Hướng xử lý: rửa dịu, dưỡng làm dịu, chống nắng.",
    ].join("\n\n");
    const sections = parseCoachNoteSections(text);
    assert.equal(sections.length, 4);
    assert.equal(sections[0]?.kind, "observe");
    assert.equal(sections[1]?.kind, "verdict");
    assert.match(pickCoachVerdict(sections) ?? "", /Tóm lại/);
    assert.ok(previewCoachText(text, 80).endsWith("…") || previewCoachText(text, 80).length <= 80);
  });
});

describe("dedupe-concerns", () => {
  it("drops weak_barrier when redness present", () => {
    assert.deepEqual(dedupeConcernIds(["acne", "redness", "weak_barrier"]), [
      "acne",
      "redness",
    ]);
  });

  it("dedupes overlapping labels", () => {
    const out = dedupeConcernLabels([
      "Đỏ / dễ kích ứng",
      "Da dễ đỏ / yếu hơn bình thường",
      "Mụn",
    ]);
    assert.equal(out.length, 2);
    assert.ok(out.includes("Mụn"));
  });
});

describe("safety-checklist", () => {
  it("turns prose into short bullets", () => {
    const items = safetyNotesToChecklist(
      "Tuần này chưa dùng acid. Đừng nặn mụn. Mỗi sáng nhớ thoa kem chống nắng.",
    );
    assert.ok(items.length >= 2);
    assert.ok(items.length <= 4);
  });
});
