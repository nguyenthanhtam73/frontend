import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { createTranslator } from "use-intl/core";

import { getPaoHint, monthsSinceOpened, paoHintCopy, type PaoHintCopy } from "./pao";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** 2026-10-03 06:00 in Asia/Ho_Chi_Minh (still 2026-10-02 in UTC). */
const BEFORE_7_ICT = new Date("2026-10-02T23:00:00.000Z");
const OPENED = "2026-08-03";

function readMessages(locale: "vi" | "en") {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "messages", `${locale}.json`), "utf8")) as {
    cabinet: Record<string, string>;
  };
}

function renderHint(locale: "vi" | "en", copy: PaoHintCopy): string {
  const t = createTranslator({
    locale,
    messages: readMessages(locale),
    namespace: "cabinet",
  });
  switch (copy.key) {
    case "paoHintOverWindow":
      return t("paoHintOverWindow");
    case "paoHintFreshFixed":
      return t("paoHintFreshFixed", copy.values);
    case "paoHintFreshRange":
      return t("paoHintFreshRange", copy.values);
    case "paoHintFixed":
      return t("paoHintFixed", copy.values);
    case "paoHintRange":
      return t("paoHintRange", copy.values);
    default: {
      const unreachable: never = copy;
      return unreachable;
    }
  }
}

function hint(locale: "vi" | "en", openedAt: string, category: string, now: Date): string {
  const pao = getPaoHint(openedAt, category, now);
  assert.ok(pao, `${category} ${openedAt}`);
  const text = renderHint(locale, paoHintCopy(pao));
  assert.doesNotMatch(text, /~|—|–/);
  return text;
}

describe("monthsSinceOpened", () => {
  it("counts Vietnam calendar months before 07:00 ICT", () => {
    assert.equal(monthsSinceOpened(OPENED, BEFORE_7_ICT), 2);
    // Still the evening of 2 Oct in Vietnam, so the 3rd has not arrived.
    assert.equal(monthsSinceOpened(OPENED, new Date("2026-10-02T16:30:00.000Z")), 1);
  });

  it("counts a full month on the last day of a shorter month", () => {
    assert.equal(monthsSinceOpened("2026-01-31", new Date("2026-02-28T10:00:00+07:00")), 1);
    assert.equal(monthsSinceOpened("2026-01-31", new Date("2026-02-27T10:00:00+07:00")), 0);
    assert.equal(monthsSinceOpened("2026-03-31", new Date("2026-04-30T10:00:00+07:00")), 1);
    assert.equal(monthsSinceOpened("2024-01-31", new Date("2024-02-29T10:00:00+07:00")), 1);
  });

  it("treats a future opened date as just opened", () => {
    assert.equal(monthsSinceOpened("2026-10-04", BEFORE_7_ICT), 0);
    assert.equal(monthsSinceOpened("2026-10-03", BEFORE_7_ICT), 0);
  });

  it("returns null for invalid dates", () => {
    assert.equal(monthsSinceOpened("", BEFORE_7_ICT), null);
    assert.equal(monthsSinceOpened("not-a-date", BEFORE_7_ICT), null);
    assert.equal(monthsSinceOpened("2026-02-31", BEFORE_7_ICT), null);
    assert.equal(monthsSinceOpened("2026-13-01", BEFORE_7_ICT), null);
    assert.equal(monthsSinceOpened("2026-08-03T00:00:00Z", BEFORE_7_ICT), null);
    assert.equal(getPaoHint(undefined, "cleanser", BEFORE_7_ICT), null);
    assert.equal(getPaoHint("   ", "serum", BEFORE_7_ICT), null);
  });
});

describe("opened-date hint copy", () => {
  it("says just opened for cleanser and serum", () => {
    assert.equal(
      hint("vi", "2026-10-03", "cleanser", BEFORE_7_ICT),
      "Mới mở. Nên dùng hết trong 12 tháng sau khi mở (gợi ý nhẹ, không phải hạn sử dụng).",
    );
    assert.equal(
      hint("vi", "2026-10-03", "serum", BEFORE_7_ICT),
      "Mới mở. Nên dùng hết trong 6 đến 12 tháng sau khi mở (gợi ý nhẹ, không phải hạn sử dụng).",
    );
    assert.equal(
      hint("en", "2026-10-03", "cleanser", BEFORE_7_ICT),
      "Just opened. You should finish it within 12 months of opening (a gentle hint, not an expiry date).",
    );
    assert.equal(
      hint("en", "2026-10-03", "serum", BEFORE_7_ICT),
      "Just opened. You should finish it within 6 to 12 months of opening (a gentle hint, not an expiry date).",
    );
  });

  it("says 2 months when checked before 07:00 ICT on the anniversary day", () => {
    assert.equal(monthsSinceOpened(OPENED, BEFORE_7_ICT), 2);
    assert.equal(
      hint("vi", OPENED, "cleanser", BEFORE_7_ICT),
      "Đã mở khoảng 2 tháng. Nên dùng hết trong 12 tháng sau khi mở.",
    );
    assert.equal(
      hint("vi", OPENED, "serum", BEFORE_7_ICT),
      "Đã mở khoảng 2 tháng. Nên dùng hết trong 6 đến 12 tháng sau khi mở.",
    );
    assert.equal(
      hint("en", OPENED, "cleanser", BEFORE_7_ICT),
      "Opened about 2 months. You should finish it within 12 months of opening.",
    );
    assert.equal(
      hint("en", OPENED, "serum", BEFORE_7_ICT),
      "Opened about 2 months. You should finish it within 6 to 12 months of opening.",
    );
  });

  it("uses the singular month in English", () => {
    const oneMonth = new Date("2026-09-03T01:00:00+07:00");
    assert.equal(monthsSinceOpened(OPENED, oneMonth), 1);
    assert.equal(
      hint("en", OPENED, "cleanser", oneMonth),
      "Opened about 1 month. You should finish it within 12 months of opening.",
    );
    assert.equal(
      hint("en", OPENED, "serum", oneMonth),
      "Opened about 1 month. You should finish it within 6 to 12 months of opening.",
    );
    assert.equal(
      hint("vi", OPENED, "cleanser", oneMonth),
      "Đã mở khoảng 1 tháng. Nên dùng hết trong 12 tháng sau khi mở.",
    );
  });

  it("keeps the normal line at 12 months and replaces it at 13", () => {
    const at12 = new Date("2027-08-03T01:00:00+07:00");
    const at13 = new Date("2027-09-03T01:00:00+07:00");
    assert.equal(monthsSinceOpened(OPENED, at12), 12);
    assert.equal(monthsSinceOpened(OPENED, at13), 13);

    assert.equal(
      hint("vi", OPENED, "cleanser", at12),
      "Đã mở khoảng 12 tháng. Nên dùng hết trong 12 tháng sau khi mở.",
    );
    assert.equal(
      hint("vi", OPENED, "serum", at12),
      "Đã mở khoảng 12 tháng. Nên dùng hết trong 6 đến 12 tháng sau khi mở.",
    );
    assert.equal(
      hint("vi", OPENED, "cleanser", at13),
      "Đã mở quá thời gian gợi ý, bạn cân nhắc thay món mới.",
    );
    assert.equal(
      hint("vi", OPENED, "serum", at13),
      "Đã mở quá thời gian gợi ý, bạn cân nhắc thay món mới.",
    );
    assert.equal(
      hint("en", OPENED, "cleanser", at13),
      "Opened longer than the suggested time. You may want to replace it with a new one.",
    );
    assert.equal(
      hint("en", OPENED, "serum", at13),
      "Opened longer than the suggested time. You may want to replace it with a new one.",
    );
    assert.equal(paoHintCopy(getPaoHint(OPENED, "spf", at13)!).key, "paoHintOverWindow");
    assert.equal(paoHintCopy(getPaoHint(OPENED, "spf", at12)!).key, "paoHintFixed");
  });

  it("treats a future opened date like just opened", () => {
    assert.equal(
      hint("vi", "2026-12-01", "cleanser", BEFORE_7_ICT),
      "Mới mở. Nên dùng hết trong 12 tháng sau khi mở (gợi ý nhẹ, không phải hạn sử dụng).",
    );
    assert.equal(
      hint("vi", "2026-12-01", "serum", BEFORE_7_ICT),
      "Mới mở. Nên dùng hết trong 6 đến 12 tháng sau khi mở (gợi ý nhẹ, không phải hạn sử dụng).",
    );
  });
});
