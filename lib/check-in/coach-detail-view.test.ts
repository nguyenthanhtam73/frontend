import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clarifyBox,
  coachSeverityLabelKey,
  coachZoneLabelKey,
  scoreNoteText,
  visibleZoneNotes,
} from "./coach-detail-view";

describe("visibleZoneNotes", () => {
  it("maps known zones and hides unknown labels while keeping the note", () => {
    const notes = visibleZoneNotes([
      { zone: "forehead", note: "Trán trông đều.", severity: "mild" },
      { zone: "left_cheek", note: "Má trái trông giống nốt nhỏ.", severity: "moderate" },
      { zone: "RIGHT_CHEEK", note: "Má phải hơi khô.", severity: "pronounced" },
      { zone: "mystery_spot", note: "Vẫn hiện câu này.", severity: "mild" },
      { zone: "nose", note: "   ", severity: "mild" },
    ]);
    assert.deepEqual(
      notes.map((n) => n.labelKey),
      ["zoneForehead", "zoneLeftCheek", "zoneRightCheek", null],
    );
    assert.equal(notes[3]?.note, "Vẫn hiện câu này.");
    assert.equal(notes[3]?.severityKey, "severityMild");
    assert.equal(coachZoneLabelKey("around_mouth"), "zoneAroundMouth");
    assert.equal(coachZoneLabelKey("chin"), "zoneChin");
    assert.equal(coachZoneLabelKey(""), null);
  });

  it("caps at 5 and drops blank notes", () => {
    const notes = visibleZoneNotes(
      Array.from({ length: 7 }, (_, i) => ({
        zone: i === 0 ? "" : "chin",
        note: i === 1 ? "  " : `nốt ${i}`,
        severity: "nope",
      })),
    );
    assert.equal(notes.length, 5);
    assert.equal(notes[0]?.labelKey, null);
    assert.equal(notes[0]?.severityKey, null);
    assert.equal(coachSeverityLabelKey("MODERATE"), "severityModerate");
  });

  it("renders nothing when the field is missing", () => {
    assert.deepEqual(visibleZoneNotes(undefined), []);
    assert.equal(scoreNoteText(undefined, "barrier"), undefined);
    assert.equal(scoreNoteText({ hydration: "  " }, "hydration"), undefined);
    assert.equal(
      scoreNoteText({ barrier: "Lớp bảo vệ da yếu hơn." }, "barrier"),
      "Lớp bảo vệ da yếu hơn.",
    );
  });
});

describe("clarifyBox", () => {
  it("stays hidden when the new fields are absent", () => {
    assert.equal(clarifyBox(undefined), null);
    assert.equal(clarifyBox({}), null);
    assert.equal(clarifyBox({ needs_more_info: false, clarify_questions: ["  "] }), null);
    assert.equal(clarifyBox({ confidence: "low" }), null);
  });

  it("uses the retake title only when confidence is low", () => {
    const low = clarifyBox({
      confidence: " low ",
      needs_more_info: true,
      clarify_questions: ["Chụp gần hơn.", "Ra chỗ sáng.", "Giữ máy thẳng.", "thừa"],
    });
    assert.deepEqual(low, {
      kind: "retake",
      items: ["Chụp gần hơn.", "Ra chỗ sáng.", "Giữ máy thẳng."],
    });
  });

  it("lists questions when confidence is not low", () => {
    const mid = clarifyBox({
      confidence: "medium",
      needs_more_info: true,
      clarify_questions: ["Sờ vào thấy cứng như hạt cát, hay mềm?"],
    });
    assert.equal(mid?.kind, "questions");
    assert.equal(mid?.items.length, 1);

    const titleOnly = clarifyBox({ needs_more_info: true, clarify_questions: [] });
    assert.deepEqual(titleOnly, { kind: "questions", items: [] });
  });
});
