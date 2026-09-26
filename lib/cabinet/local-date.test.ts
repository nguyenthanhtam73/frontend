import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { localDateInputValue } from "./local-date";

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
