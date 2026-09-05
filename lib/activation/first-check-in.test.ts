import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hasNeverCheckedIn,
  shouldShowActivationBanner,
  shouldShowCheckInFirstVisit,
  shouldShowFirstCheckInPrompt,
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
    dismissed: false,
    awaiting: false,
    streakStatus: "ready" as const,
    neverCheckedIn: true,
  };

  it("shows for signed-in users who have never checked in", () => {
    assert.equal(shouldShowFirstCheckInPrompt(readyNever), true);
  });

  it("hides for guests, pending claim, or dismissed skip", () => {
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
      shouldShowFirstCheckInPrompt({ ...readyNever, dismissed: true }),
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
