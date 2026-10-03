import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { clampOpenedDate, localDateInputValue, vietnamDateKey } from "./local-date";

describe("localDateInputValue", () => {
  it("builds YYYY-MM-DD from local date parts", () => {
    const morning = new Date(2026, 8, 26, 0, 30, 0);
    assert.equal(localDateInputValue(morning), "2026-09-26");
    assert.equal(
      localDateInputValue(morning),
      `${morning.getFullYear()}-${String(morning.getMonth() + 1).padStart(2, "0")}-${String(morning.getDate()).padStart(2, "0")}`,
    );
  });

  it("does not follow the UTC day when local midnight is a different ISO date", () => {
    const morning = new Date(2026, 8, 26, 0, 30, 0);
    const utcDay = morning.toISOString().slice(0, 10);
    if (utcDay !== "2026-09-26") {
      assert.equal(localDateInputValue(morning), "2026-09-26");
      assert.notEqual(localDateInputValue(morning), utcDay);
    }
  });
});

describe("vietnamDateKey", () => {
  it("is the Vietnam calendar day even before 07:00 ICT", () => {
    // 2026-10-02 23:30 UTC = 2026-10-03 06:30 in Asia/Ho_Chi_Minh
    assert.equal(vietnamDateKey(new Date("2026-10-02T23:30:00.000Z")), "2026-10-03");
    // 2026-10-02 16:30 UTC = 2026-10-02 23:30 in Asia/Ho_Chi_Minh
    assert.equal(vietnamDateKey(new Date("2026-10-02T16:30:00.000Z")), "2026-10-02");
  });
});

describe("clampOpenedDate", () => {
  it("blocks a future opened date and keeps today or earlier", () => {
    const today = "2026-10-03";
    assert.equal(clampOpenedDate("2026-10-04", today), "2026-10-03");
    assert.equal(clampOpenedDate("2026-10-03", today), "2026-10-03");
    assert.equal(clampOpenedDate("2026-08-03", today), "2026-08-03");
    assert.equal(clampOpenedDate("", today), "");
    assert.equal(clampOpenedDate("not-a-date", today), "not-a-date");
  });
});
