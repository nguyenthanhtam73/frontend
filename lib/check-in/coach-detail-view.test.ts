import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  clarifyBox,
  coachSeverityLabelKey,
  coachZoneLabelKey,
  isGoodSkinNote,
  scoreNoteText,
  stripLeadingZoneLabel,
  visibleZoneNotes,
} from "./coach-detail-view";

const viLabels = {
  zoneLeftCheek: "Má trái",
  zoneForehead: "Trán",
  zoneJawline: "Viền hàm",
} as const;

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

  it("skips mistyped zone notes instead of throwing", () => {
    assert.deepEqual(visibleZoneNotes({ zone: "chin", note: "Cằm khô" }), []);
    const notes = visibleZoneNotes([
      { zone: 1, note: 2, severity: 3 },
      { zone: 4, note: "Vẫn hiện vì câu là chữ.", severity: 5 },
      { zone: "chin", note: "Cằm hơi khô.", severity: "mild" },
    ]);
    assert.equal(notes.length, 2);
    assert.equal(notes[0]?.labelKey, null);
    assert.equal(notes[0]?.severityKey, null);
    assert.equal(notes[0]?.note, "Vẫn hiện vì câu là chữ.");
    assert.equal(notes[1]?.labelKey, "zoneChin");
    assert.equal(coachZoneLabelKey(12), null);
    assert.equal(coachSeverityLabelKey(9), null);
  });

  it("hides the severity label on a good-skin note and keeps the zone and the sentence", () => {
    assert.equal(isGoodSkinNote("Da mịn màng, không thấy mụn."), true);
    assert.equal(isGoodSkinNote("Da mịn màng, không có dấu hiệu mụn."), true);
    assert.equal(isGoodSkinNote("Skin looks smooth, no sign of spots."), true);
    assert.equal(isGoodSkinNote("Trông giống vài nốt nhỏ."), false);
    assert.equal(isGoodSkinNote("Looks like a small bump."), false);
    assert.equal(isGoodSkinNote("Looks like smooth, clear skin."), false);
    assert.equal(isGoodSkinNote("Hơi khô ở mép."), false);
    assert.equal(isGoodSkinNote("No significant change today."), false);
    for (const note of [
      "Da mịn màng, hơi sần.",
      "Da mịn màng, có vài chấm li ti.",
      "Da mịn màng, không thấy mụn nhưng hơi ửng.",
      "Không có dấu hiệu viêm nhưng lỗ chân lông to.",
      "Không thấy mụn viêm, chỉ vài nốt mụn ẩn.",
      "Không thấy mụn nhưng da kích ứng.",
      "Smooth overall but a few red bumps.",
    ]) {
      assert.equal(isGoodSkinNote(note), false, note);
      const [row] = visibleZoneNotes([{ zone: "chin", note, severity: "mild" }]);
      assert.equal(row?.note, note, note);
      assert.equal(row?.severityKey, "severityMild", note);
    }

    const notes = visibleZoneNotes([
      {
        zone: "forehead",
        note: "Da mịn màng, không thấy mụn.",
        severity: "mild",
      },
      {
        zone: "left_cheek",
        note: "Trông giống vài nốt nhỏ.",
        severity: "mild",
      },
    ], viLabels);
    assert.equal(notes[0]?.labelKey, "zoneForehead");
    assert.equal(notes[0]?.note, "Da mịn màng, không thấy mụn.");
    assert.equal(notes[0]?.severityKey, null);
    assert.equal(notes[1]?.labelKey, "zoneLeftCheek");
    assert.equal(notes[1]?.note, "Trông giống vài nốt nhỏ.");
    assert.equal(notes[1]?.severityKey, "severityMild");
  });

  it("drops a leading zone label only when that label is shown", () => {
    assert.equal(
      stripLeadingZoneLabel("Má trái trông giống nốt nhỏ", "Má trái"),
      "Trông giống nốt nhỏ",
    );
    assert.equal(
      stripLeadingZoneLabel("MÁ TRÁI trông giống nốt nhỏ", "Má trái"),
      "Trông giống nốt nhỏ",
    );
    assert.equal(
      stripLeadingZoneLabel("Má trái: hơi khô", "Má trái"),
      "Hơi khô",
    );
    assert.equal(
      stripLeadingZoneLabel("Má trái – hơi khô", "Má trái"),
      "Hơi khô",
    );
    assert.equal(stripLeadingZoneLabel("Má trái", "Má trái"), "Má trái");
    const decomposed = `${"Má trái".normalize("NFD")} trông giống nốt nhỏ`;
    assert.equal(stripLeadingZoneLabel(decomposed, "Má trái"), "Trông giống nốt nhỏ");
    assert.equal(
      stripLeadingZoneLabel("Có nốt nhỏ ở má trái.", "Má trái"),
      "Có nốt nhỏ ở má trái.",
    );
    assert.equal(stripLeadingZoneLabel("Cơ địa dễ khô.", "Cổ"), "Cơ địa dễ khô.");
    assert.equal(stripLeadingZoneLabel("Có vài nốt đỏ.", "Cổ"), "Có vài nốt đỏ.");
    assert.equal(stripLeadingZoneLabel("Tràn nhẹ ở giữa.", "Trán"), "Tràn nhẹ ở giữa.");
    assert.equal(stripLeadingZoneLabel("Tràn…", "Trán"), "Tràn…");
    assert.equal(stripLeadingZoneLabel("Mùi hơi lạ.", "Mũi"), "Mùi hơi lạ.");
    assert.equal(stripLeadingZoneLabel("Mùi…", "Mũi"), "Mùi…");
    assert.equal(stripLeadingZoneLabel("Cam sần một chút.", "Cằm"), "Cam sần một chút.");
    assert.equal(stripLeadingZoneLabel("Cam…", "Cằm"), "Cam…");
    assert.equal(stripLeadingZoneLabel("Má tráii hơi đỏ.", "Má trái"), "Má tráii hơi đỏ.");
    assert.equal(stripLeadingZoneLabel("Má trái - hơi khô", "Má trái"), "Hơi khô");
    assert.equal(stripLeadingZoneLabel("Má trái—hơi khô", "Má trái"), "Hơi khô");

    const shown = visibleZoneNotes(
      [{ zone: "left_cheek", note: "Má trái trông giống nốt nhỏ", severity: "mild" }],
      viLabels,
    );
    assert.equal(shown[0]?.note, "Trông giống nốt nhỏ");
    assert.equal(shown[0]?.labelKey, "zoneLeftCheek");

    const hidden = visibleZoneNotes(
      [{ zone: "mystery_spot", note: "Má trái trông giống nốt nhỏ", severity: "mild" }],
      viLabels,
    );
    assert.equal(hidden[0]?.labelKey, null);
    assert.equal(hidden[0]?.note, "Má trái trông giống nốt nhỏ");
  });
});

describe("score notes", () => {
  it("skips numeric score sentences", () => {
    assert.equal(
      scoreNoteText({ overall: 1, hydration: "Má hơi khô.", clarity: null, barrier: true }, "overall"),
      undefined,
    );
    assert.equal(
      scoreNoteText({ overall: 1, hydration: "Má hơi khô." }, "hydration"),
      "Má hơi khô.",
    );
    assert.equal(scoreNoteText(["not", "an", "object"], "overall"), undefined);
  });

  it("strips a leaked gauge sentence down to the reason", () => {
    assert.equal(
      scoreNoteText({ overall: "score 0.78 vì da vẫn khỏe mạnh" }, "overall"),
      "Da vẫn khỏe mạnh",
    );
    assert.equal(
      scoreNoteText({ hydration: "score 0.72 vì mụn ẩn vẫn còn" }, "hydration"),
      "Mụn ẩn vẫn còn",
    );
  });
});

describe("clarifyBox", () => {
  it("stays hidden when there is nothing to list", () => {
    assert.equal(clarifyBox(undefined), null);
    assert.equal(clarifyBox({}), null);
    assert.equal(clarifyBox({ photoKind: "limited" }), null);
    assert.equal(clarifyBox({ photoKind: "limited", clarify_questions: ["  "] }), null);
    assert.equal(clarifyBox({ photoKind: "ok", confidence: "low" }), null);
    assert.equal(
      clarifyBox({ photoKind: "ok", clarify_questions: [], confidence: "low" }),
      null,
    );
  });

  it("uses the retake title for a limited or skipped photo", () => {
    const limited = clarifyBox({
      photoKind: "limited",
      confidence: "high",
      clarify_questions: ["Chụp gần hơn.", "Ra chỗ sáng.", "Giữ máy thẳng.", "thừa"],
    });
    assert.deepEqual(limited, {
      kind: "retake",
      items: ["Chụp gần hơn.", "Ra chỗ sáng.", "Giữ máy thẳng."],
    });
    assert.equal(
      clarifyBox({ photoKind: "skip", clarify_questions: ["Thêm một ảnh mặt."] })?.kind,
      "retake",
    );
  });

  it("keeps the question title when the photo is clear, even if confidence is low", () => {
    const clear = clarifyBox({
      photoKind: "ok",
      confidence: "low",
      clarify_questions: ["Sờ vào thấy cứng như hạt cát, hay mềm?"],
    });
    assert.deepEqual(clear, {
      kind: "questions",
      items: ["Sờ vào thấy cứng như hạt cát, hay mềm?"],
    });
  });

  it("skips mistyped questions and a numeric confidence", () => {
    assert.equal(clarifyBox({ photoKind: "ok", clarify_questions: "Chụp lại gần hơn" }), null);
    assert.deepEqual(
      clarifyBox({
        photoKind: "ok",
        confidence: 1,
        clarify_questions: [1, "Sờ thấy cứng hay mềm?", false],
      }),
      {
        kind: "questions",
        items: ["Sờ thấy cứng hay mềm?"],
      },
    );
    assert.equal(
      clarifyBox({ photoKind: "limited", confidence: 0, clarify_questions: [2, 3] }),
      null,
    );
  });
});
