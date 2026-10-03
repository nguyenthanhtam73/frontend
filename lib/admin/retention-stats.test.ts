import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  adminRetentionLoadError,
  formatRetentionAsOf,
  formatRetentionPercent,
  isIsoDate,
  retentionDateRangeIssue,
  retentionShareRows,
  retentionStatsSearch,
} from "./retention-stats";

const SAMPLE_COUNTS = {
  at_least_1: 5,
  at_least_2: 4,
  at_least_7: 3,
  at_least_14: 1,
};

describe("admin retention-stats display helpers", () => {
  it("accepts real YYYY-MM-DD days and rejects the rest", () => {
    assert.equal(isIsoDate("2026-10-03"), true);
    assert.equal(isIsoDate("2026-02-29"), false);
    assert.equal(isIsoDate("2024-02-29"), true);
    assert.equal(isIsoDate("2026-13-01"), false);
    assert.equal(isIsoDate("03-10-2026"), false);
    assert.equal(isIsoDate(""), false);
  });

  it("builds the optional from/to query and flags a reversed range", () => {
    assert.equal(retentionStatsSearch("", ""), "");
    assert.equal(retentionStatsSearch("2026-09-01", ""), "from=2026-09-01");
    assert.equal(retentionStatsSearch("", "2026-09-30"), "to=2026-09-30");
    assert.equal(
      retentionStatsSearch("2026-09-01", "2026-09-30"),
      "from=2026-09-01&to=2026-09-30",
    );
    assert.equal(retentionStatsSearch("nope", "2026-02-31"), "");
    assert.equal(retentionDateRangeIssue("2026-09-01", "2026-09-30"), null);
    assert.equal(retentionDateRangeIssue("2026-09-30", "2026-09-01"), "order");
    assert.equal(retentionDateRangeIssue("2026-09-01", ""), null);
  });

  it("shows count as a percent of registered users and of people who checked in", () => {
    assert.equal(formatRetentionPercent(5, 8), "62.5%");
    assert.equal(formatRetentionPercent(4, 5), "80.0%");
    assert.equal(formatRetentionPercent(0, 8), "0.0%");
    assert.equal(formatRetentionPercent(1, 0), "—");
    assert.equal(formatRetentionPercent(1, -1), "—");

    const rows = retentionShareRows(SAMPLE_COUNTS, 8, 5);
    assert.deepEqual(
      rows.map((row) => [row.threshold, row.count, row.ofRegistered, row.ofCheckedIn]),
      [
        [1, 5, "62.5%", "100.0%"],
        [2, 4, "50.0%", "80.0%"],
        [7, 3, "37.5%", "60.0%"],
        [14, 1, "12.5%", "20.0%"],
      ],
    );
    assert.equal(retentionShareRows(SAMPLE_COUNTS, 0, 0)[0]?.ofRegistered, "—");
    assert.equal(retentionShareRows(SAMPLE_COUNTS, 0, 0)[0]?.ofCheckedIn, "—");
  });

  it("prints as_of on the Asia/Bangkok clock", () => {
    const label = formatRetentionAsOf("2026-10-03T12:02:37Z", "en-GB");
    assert.match(label, /19:02/);
    assert.match(label, /03\/10\/2026/);
    assert.equal(formatRetentionAsOf("not-a-date", "en-GB"), "not-a-date");
  });

  it("maps 401, 403, and a missing endpoint for the admin gate", () => {
    assert.equal(adminRetentionLoadError(new Error("auth")), "auth");
    assert.equal(adminRetentionLoadError(new Error("forbidden")), "forbidden");
    assert.equal(adminRetentionLoadError(new Error("not_found")), "not_found");
    assert.equal(adminRetentionLoadError(new Error("network")), "unknown");
    assert.equal(adminRetentionLoadError("nope"), "unknown");
  });
});
