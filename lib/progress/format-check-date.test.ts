import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatCheckDate } from "./format-check-date";

const now = new Date("2026-11-24T12:00:00+07:00");

describe("formatCheckDate", () => {
  it("shows day/month in Vietnamese and adds the year when needed", () => {
    assert.equal(formatCheckDate("2026-11-24", "vi", now), "24/11");
    assert.equal(formatCheckDate("2026-01-03", "vi", now), "03/01");
    assert.equal(formatCheckDate("2025-01-03", "vi", now), "03/01/2025");
  });

  it("uses a month name in English", () => {
    assert.equal(formatCheckDate("2026-11-24", "en", now), "Nov 24");
    assert.equal(formatCheckDate("2026-01-03", "en", now), "Jan 3");
    assert.equal(formatCheckDate("2025-11-24", "en", now), "Nov 24, 2025");
  });
});
