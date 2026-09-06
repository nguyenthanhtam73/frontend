import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  adminFunnelLoadError,
  d1Ratio,
  d1Ratio7d,
  formatEligibleRatio,
  formatPaywallCard,
  isPaywallUntracked,
  resolvePaywallViews7d,
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
    assert.equal(formatPaywallCard(null, "N/A"), "N/A");
    assert.equal(formatPaywallCard(undefined, "N/A"), "N/A");
    assert.equal(formatPaywallCard(0, "N/A"), "0");
    assert.equal(formatPaywallCard(12, "N/A"), "12");
  });

  it("prefers paywall_views_7d and falls back to the legacy field", () => {
    assert.equal(resolvePaywallViews7d({ paywall_views_7d: 9, paywall_views: 9 }), 9);
    assert.equal(resolvePaywallViews7d({ paywall_views_7d: 0, paywall_views: 0 }), 0);
    assert.equal(resolvePaywallViews7d({ paywall_views: null }), null);
    assert.equal(
      resolvePaywallViews7d({ paywall_views_7d: undefined, paywall_views: 3 }),
      3,
    );
  });

  it("maps 401/403 fetch errors for the admin gate", () => {
    assert.equal(adminFunnelLoadError(new Error("auth")), "auth");
    assert.equal(adminFunnelLoadError(new Error("forbidden")), "forbidden");
    assert.equal(adminFunnelLoadError(new Error("network")), "unknown");
    assert.equal(adminFunnelLoadError("nope"), "unknown");
  });
});
