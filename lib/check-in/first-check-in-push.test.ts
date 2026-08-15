import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isFirstCheckInStreak,
  shouldPromptFirstCheckInPush,
} from "./first-check-in-push";

describe("isFirstCheckInStreak", () => {
  it("treats streak 1 without dates as first check-in (POST payload)", () => {
    assert.equal(isFirstCheckInStreak({ current_streak: 1 }), true);
  });

  it("requires first and last dates to match when both exist", () => {
    assert.equal(
      isFirstCheckInStreak({
        current_streak: 1,
        first_check_in_date: "2026-08-14",
        last_check_in_date: "2026-08-14",
      }),
      true,
    );
    assert.equal(
      isFirstCheckInStreak({
        current_streak: 1,
        first_check_in_date: "2026-08-01",
        last_check_in_date: "2026-08-14",
      }),
      false,
    );
  });

  it("rejects longer streaks", () => {
    assert.equal(isFirstCheckInStreak({ current_streak: 2 }), false);
    assert.equal(isFirstCheckInStreak({ current_streak: 0 }), false);
  });
});

describe("shouldPromptFirstCheckInPush", () => {
  const base = {
    checkInCompleted: true,
    isFirstCheckIn: true,
    supportOk: true,
    permission: "default" as const,
    localPushEnabled: false,
    nudgeStatus: null,
  };

  it("shows after first completed check-in when push is off", () => {
    assert.equal(shouldPromptFirstCheckInPush(base), true);
  });

  it("hides when not first check-in or not completed", () => {
    assert.equal(
      shouldPromptFirstCheckInPush({ ...base, isFirstCheckIn: false }),
      false,
    );
    assert.equal(
      shouldPromptFirstCheckInPush({ ...base, checkInCompleted: false }),
      false,
    );
  });

  it("hides when unsupported, denied, already on, or already decided", () => {
    assert.equal(
      shouldPromptFirstCheckInPush({ ...base, supportOk: false }),
      false,
    );
    assert.equal(
      shouldPromptFirstCheckInPush({ ...base, permission: "denied" }),
      false,
    );
    assert.equal(
      shouldPromptFirstCheckInPush({ ...base, localPushEnabled: true }),
      false,
    );
    assert.equal(
      shouldPromptFirstCheckInPush({ ...base, nudgeStatus: "dismissed" }),
      false,
    );
    assert.equal(
      shouldPromptFirstCheckInPush({ ...base, nudgeStatus: "enabled" }),
      false,
    );
  });
});
