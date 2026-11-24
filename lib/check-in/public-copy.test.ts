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
    assert.equal(
      toPublicCopy("hydration: 0.78 vì da vẫn khỏe mạnh"),
      "Da vẫn khỏe mạnh",
    );
    assert.equal(
      toPublicCopy("skin_score_notes: 0.78 vì da vẫn khỏe mạnh"),
      "Da vẫn khỏe mạnh",
    );
    assert.equal(
      toPublicCopy("Sáng: score 0.78 vì thoa kem chống nắng SPF50"),
      "Sáng: Thoa kem chống nắng SPF50",
    );
    assert.equal(
      toPublicCopy("Tối: score 0.72 vì dưỡng ẩm, ngày 7 nhớ nhẹ tay"),
      "Tối: Dưỡng ẩm, ngày 7 nhớ nhẹ tay",
    );
  });

  it("drops a gauge key and keeps an ingredient strength", () => {
    assert.equal(toPublicCopy("hydration: 0.78 vì da khô"), "Da khô");
    assert.equal(toPublicCopy("Hydration: 0.78 vì da khô"), "Da khô");
    assert.equal(toPublicCopy("overall: 0.78"), "");
    assert.equal(toPublicCopy("Da ổn. Clarity: 0.55 vì có nốt"), "Da ổn. Có nốt");
    assert.equal(toPublicCopy("BARRIER: 0,40 vì lớp ngoài yếu"), "Lớp ngoài yếu");
    assert.equal(toPublicCopy("Retinol: 0.025"), "Retinol: 0.025");
    assert.equal(toPublicCopy("Vitamin C: 0.025"), "Vitamin C: 0.025");
    assert.equal(toPublicCopy("BHA: 0.5"), "BHA: 0.5");
    assert.equal(toPublicCopy("niacinamide: 0.10"), "niacinamide: 0.10");
    assert.equal(toPublicCopy("ghi chú: 0.78 vì da ổn"), "ghi chú: Da ổn");
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

  it("keeps doses, strengths, and ranges", () => {
    assert.equal(toPublicCopy("Lấy 0,5 ml serum"), "Lấy 0,5 ml serum");
    assert.equal(toPublicCopy("BHA 0.5–2%"), "BHA 0.5–2%");
    assert.equal(toPublicCopy("Retinol 0.025 hoặc 0.05"), "Retinol 0.025 hoặc 0.05");
    assert.equal(toPublicCopy("Gel 0.5g"), "Gel 0.5g");
    assert.equal(toPublicCopy("Bôi 1,0 lớp"), "Bôi 1,0 lớp");
    assert.equal(toPublicCopy("Khoảng 0,5 đến 1 ml"), "Khoảng 0,5 đến 1 ml");
    assert.equal(toPublicCopy("Dùng 0.3~0.5 g"), "Dùng 0.3~0.5 g");
  });

  it("does not strip snake_case inside a URL or email", () => {
    assert.equal(
      toPublicCopy("https://dadiary.vn/a_b_c"),
      "https://dadiary.vn/a_b_c",
    );
    assert.equal(
      toPublicCopy("Xem https://dadiary.vn/a_b_c hôm nay."),
      "Xem https://dadiary.vn/a_b_c hôm nay.",
    );
    assert.equal(
      toPublicCopy("Gửi skin_coach@dadiary.vn giúp mình."),
      "Gửi skin_coach@dadiary.vn giúp mình.",
    );
    assert.equal(
      toPublicCopy("Xem skin_score_notes tại https://dadiary.vn/a_b_c."),
      "Xem tại https://dadiary.vn/a_b_c.",
    );
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
