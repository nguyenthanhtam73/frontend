import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  adminFunnelLoadError,
  d1Ratio,
  d1Ratio7d,
  formatEligibleRatio,
  isPaywallUntracked,
} from "./funnel-stats";

describe("admin funnel-stats display helpers", () => {
  it("formats D1 as n / eligible", () => {
    assert.equal(formatEligibleRatio(3, 10), "3 / 10");
    assert.equal(formatEligibleRatio(0, 0), "0 / 0");
    assert.equal(
      d1Ratio({ d1_checkin_users: 2, d1_eligible_users: 8 }),
      "2 / 8",
    );
    assert.equal(
      d1Ratio7d({ d1_checkin_users_7d: 1, d1_eligible_users_7d: 5 }),
      "1 / 5",
    );
  });

  it("treats null paywall views as untracked (N/A)", () => {
    assert.equal(isPaywallUntracked(null), true);
    assert.equal(isPaywallUntracked(undefined), true);
    assert.equal(isPaywallUntracked(0), false);
    assert.equal(isPaywallUntracked(12), false);
  });

  it("maps 401/403 fetch errors for the admin gate", () => {
    assert.equal(adminFunnelLoadError(new Error("auth")), "auth");
    assert.equal(adminFunnelLoadError(new Error("forbidden")), "forbidden");
    assert.equal(adminFunnelLoadError(new Error("network")), "unknown");
    assert.equal(adminFunnelLoadError("nope"), "unknown");
  });
});
