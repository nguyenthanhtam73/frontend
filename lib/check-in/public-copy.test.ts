import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { toPublicCopy } from "./public-copy";

describe("toPublicCopy", () => {
  it("turns a leading score gauge into the reason", () => {
    assert.equal(
      toPublicCopy("score 0.78 vì da vẫn khỏe mạnh"),
      "Da vẫn khỏe mạnh",
    );
    assert.equal(
      toPublicCopy("score 0.72 vì mụn ẩn vẫn còn"),
      "Mụn ẩn vẫn còn",
    );
    assert.equal(
      toPublicCopy("SCORE 0,78: da vẫn khỏe mạnh"),
      "Da vẫn khỏe mạnh",
    );
    assert.equal(toPublicCopy("score 0.78, da vẫn khỏe"), "Da vẫn khỏe");
    assert.equal(toPublicCopy("0.78 vì da vẫn khỏe mạnh"), "Da vẫn khỏe mạnh");
    assert.equal(
      toPublicCopy("Sáng: score 0.78 vì thoa kem chống nắng SPF50"),
      "Sáng: Thoa kem chống nắng SPF50",
    );
    assert.equal(
      toPublicCopy("Tối: score 0.72 vì dưỡng ẩm, ngày 7 nhớ nhẹ tay"),
      "Tối: Dưỡng ẩm, ngày 7 nhớ nhẹ tay",
    );
  });

  it("keeps counts, SPF, dates, ngày 7, and percentages", () => {
    assert.equal(toPublicCopy("Còn 2–3 nốt."), "Còn 2–3 nốt.");
    assert.equal(toPublicCopy("Nhớ thoa SPF50."), "Nhớ thoa SPF50.");
    assert.equal(
      toPublicCopy("Check-in ngày 7, khoảng 78%."),
      "Check-in ngày 7, khoảng 78%.",
    );
    assert.equal(
      toPublicCopy("Hẹn 2026-09-01 hoặc 7/11."),
      "Hẹn 2026-09-01 hoặc 7/11.",
    );
    assert.equal(toPublicCopy("Nồng độ 0.5% và 10%."), "Nồng độ 0.5% và 10%.");
  });

  it("removes snake_case field names", () => {
    assert.equal(
      toPublicCopy(
        "situation_analysis concern_alignment skin_score_notes skin_scores zone_notes care_suggestions routine_hints summary_notes photo_evidence medical_disclaimer product_suggestions",
      ),
      "",
    );
    assert.equal(
      toPublicCopy("zone_notes: 2–3 nốt, SPF50, ngày 7, 78%."),
      "2–3 nốt, SPF50, ngày 7, 78%.",
    );
    assert.equal(
      toPublicCopy("Có custom_field_name trong câu này."),
      "Có trong câu này.",
    );
  });

  it("leaves ordinary prose, including the current voice, unchanged", () => {
    assert.equal(
      toPublicCopy("Mày ghi mụn ẩn, và ảnh hôm nay tao thấy đúng vậy"),
      "Mày ghi mụn ẩn, và ảnh hôm nay tao thấy đúng vậy",
    );
    assert.equal(toPublicCopy("da mày vẫn ổn"), "da mày vẫn ổn");
    assert.equal(toPublicCopy("Lớp bảo vệ da yếu hơn."), "Lớp bảo vệ da yếu hơn.");
  });

  it("does not damage English that merely says score", () => {
    assert.equal(
      toPublicCopy("Your skin score looks steady today."),
      "Your skin score looks steady today.",
    );
    assert.equal(
      toPublicCopy("Apply SPF50 every morning."),
      "Apply SPF50 every morning.",
    );
    assert.equal(
      toPublicCopy("score 0.78 because the barrier feels calm."),
      "Because the barrier feels calm.",
    );
    assert.equal(
      toPublicCopy("The note says score 0.64 vì má hơi khô."),
      "The note says má hơi khô.",
    );
  });
});
