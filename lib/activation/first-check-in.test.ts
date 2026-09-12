import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  FIRST_CHECK_IN_LATER_DELAY_MS,
  hasNeverCheckedIn,
  laterTodayFromMap,
  shouldShowActivationBanner,
  shouldShowCheckInFirstVisit,
  shouldShowFirstCheckInPrompt,
  shouldShowNeverCheckedInBar,
} from "./first-check-in";

describe("hasNeverCheckedIn", () => {
  it("treats missing streak as never checked in", () => {
    assert.equal(hasNeverCheckedIn(null), true);
    assert.equal(hasNeverCheckedIn(undefined), true);
    assert.equal(hasNeverCheckedIn({}), true);
    assert.equal(hasNeverCheckedIn({ current_streak: 0 }), true);
  });

  it("rejects any prior check-in signal", () => {
    assert.equal(hasNeverCheckedIn({ current_streak: 1 }), false);
    assert.equal(
      hasNeverCheckedIn({ current_streak: 0, first_check_in_date: "2026-09-01" }),
      false,
    );
    assert.equal(
      hasNeverCheckedIn({ current_streak: 0, last_check_in_date: "2026-09-01" }),
      false,
    );
  });
});

describe("shouldShowFirstCheckInPrompt", () => {
  const readyNever = {
    signedIn: true,
    isGuest: false,
    pendingAccountClaim: false,
    laterToday: false,
    awaiting: false,
    streakStatus: "ready" as const,
    neverCheckedIn: true,
  };

  it("shows for signed-in users who have never checked in", () => {
    assert.equal(shouldShowFirstCheckInPrompt(readyNever), true);
  });

  it("hides for guests, pending claim, or later-today snooze", () => {
    assert.equal(
      shouldShowFirstCheckInPrompt({ ...readyNever, isGuest: true }),
      false,
    );
    assert.equal(
      shouldShowFirstCheckInPrompt({ ...readyNever, signedIn: false }),
      false,
    );
    assert.equal(
      shouldShowFirstCheckInPrompt({ ...readyNever, pendingAccountClaim: true }),
      false,
    );
    assert.equal(
      shouldShowFirstCheckInPrompt({ ...readyNever, laterToday: true }),
      false,
    );
  });

  it("does not flash while streak loads unless just claimed/finished", () => {
    assert.equal(
      shouldShowFirstCheckInPrompt({
        ...readyNever,
        streakStatus: "loading",
      }),
      false,
    );
    assert.equal(
      shouldShowFirstCheckInPrompt({
        ...readyNever,
        streakStatus: "loading",
        awaiting: true,
      }),
      true,
    );
  });

  it("shows on streak error so activation still has a path", () => {
    assert.equal(
      shouldShowFirstCheckInPrompt({
        ...readyNever,
        streakStatus: "error",
        neverCheckedIn: false,
      }),
      true,
    );
  });

  it("hides once the user already has a check-in", () => {
    assert.equal(
      shouldShowFirstCheckInPrompt({ ...readyNever, neverCheckedIn: false }),
      false,
    );
  });
});

describe("FIRST_CHECK_IN_LATER_DELAY_MS", () => {
  it("keeps Later today off the first-check-in prompt for the first 30s", () => {
    assert.equal(FIRST_CHECK_IN_LATER_DELAY_MS, 30_000);
  });
});

describe("laterTodayFromMap", () => {
  it("reads a YYYY-MM-DD snooze day and ignores junk", () => {
    assert.equal(
      laterTodayFromMap({ u1: "2026-09-06" }, "u1"),
      "2026-09-06",
    );
    assert.equal(laterTodayFromMap({ u1: "nope" }, "u1"), null);
    assert.equal(laterTodayFromMap(null, "u1"), null);
  });
});

describe("shouldShowNeverCheckedInBar", () => {
  const base = {
    signedIn: true,
    laterToday: false,
    onFunnelPath: false,
    onCheckInPath: false,
    onCoachWelcomePath: false,
    streakStatus: "ready" as const,
    neverCheckedIn: true,
  };

  it("stays up until first check-in or later-today", () => {
    assert.equal(shouldShowNeverCheckedInBar(base), true);
    assert.equal(
      shouldShowNeverCheckedInBar({ ...base, laterToday: true }),
      false,
    );
    assert.equal(
      shouldShowNeverCheckedInBar({ ...base, neverCheckedIn: false }),
      false,
    );
  });

  it("stays hidden on check-in and coach-welcome, but can show on the wizard", () => {
    assert.equal(
      shouldShowNeverCheckedInBar({ ...base, onCheckInPath: true }),
      false,
    );
    assert.equal(
      shouldShowNeverCheckedInBar({ ...base, onCoachWelcomePath: true }),
      false,
    );
    assert.equal(
      shouldShowNeverCheckedInBar({ ...base, onFunnelPath: false }),
      true,
    );
  });
});

describe("shouldShowActivationBanner", () => {
  const base = {
    signedIn: true,
    dismissed: false,
    onFunnelPath: false,
    onCheckInPath: false,
    onCoachWelcomePath: false,
    streakStatus: "ready" as const,
    neverCheckedIn: true,
  };

  it("shows a soft reminder off the funnel when streak is 0", () => {
    assert.equal(shouldShowActivationBanner(base), true);
  });

  it("stays off the guest funnel, coach-welcome, and check-in page", () => {
    assert.equal(
      shouldShowActivationBanner({ ...base, onFunnelPath: true }),
      false,
    );
    assert.equal(
      shouldShowActivationBanner({ ...base, onCoachWelcomePath: true }),
      false,
    );
    assert.equal(
      shouldShowActivationBanner({ ...base, onCheckInPath: true }),
      false,
    );
  });

  it("waits for a real streak payload (no fake idle state)", () => {
    assert.equal(
      shouldShowActivationBanner({ ...base, streakStatus: "loading" }),
      false,
    );
    assert.equal(
      shouldShowActivationBanner({ ...base, streakStatus: "error" }),
      false,
    );
    assert.equal(
      shouldShowActivationBanner({ ...base, neverCheckedIn: false }),
      false,
    );
  });
});

describe("shouldShowCheckInFirstVisit", () => {
  it("welcomes first-timers on /check-in only", () => {
    assert.equal(
      shouldShowCheckInFirstVisit({
        signedIn: true,
        onCheckInPath: true,
        streakStatus: "ready",
        neverCheckedIn: true,
      }),
      true,
    );
    assert.equal(
      shouldShowCheckInFirstVisit({
        signedIn: true,
        onCheckInPath: false,
        streakStatus: "ready",
        neverCheckedIn: true,
      }),
      false,
    );
    assert.equal(
      shouldShowCheckInFirstVisit({
        signedIn: true,
        onCheckInPath: true,
        streakStatus: "ready",
        neverCheckedIn: false,
      }),
      false,
    );
  });
});
