import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  streakHistoryHintKey,
  streakMilestoneSubKey,
  streakProtectionContextKey,
} from "./protection-copy";

describe("streakProtectionContextKey", () => {
  const base = {
    allowFreeze: false,
    blockReason: "none" as const,
    pendingAuto: false,
    isProtected: false,
    atRisk: false,
  };

  it("explains protection after first check-in instead of a hard deny", () => {
    assert.equal(
      streakProtectionContextKey({ ...base, blockReason: "no_streak" }),
      "freeze.contextIdle",
    );
  });

  it("aligns at-risk freeze copy with check-in-today", () => {
    assert.equal(
      streakProtectionContextKey({
        ...base,
        allowFreeze: true,
        atRisk: true,
      }),
      "freeze.contextAtRisk",
    );
  });

  it("keeps manual freeze copy when the streak is already on track", () => {
    assert.equal(
      streakProtectionContextKey({ ...base, allowFreeze: true }),
      "freeze.contextManual",
    );
  });

  it("prefers auto-save and active-protection lines over at-risk copy", () => {
    assert.equal(
      streakProtectionContextKey({
        ...base,
        allowFreeze: true,
        atRisk: true,
        pendingAuto: true,
      }),
      "freeze.contextAutoSave",
    );
    assert.equal(
      streakProtectionContextKey({
        ...base,
        isProtected: true,
        atRisk: true,
      }),
      null,
    );
  });

  it("keeps break / exhausted reasons", () => {
    assert.equal(
      streakProtectionContextKey({ ...base, blockReason: "soft_expired" }),
      "freeze.block.soft_expired",
    );
    assert.equal(
      streakProtectionContextKey({ ...base, blockReason: "no_freezes" }),
      "freeze.exhausted",
    );
  });
});

describe("streakHistoryHintKey", () => {
  it("uses empty caption before the first check-in", () => {
    assert.equal(streakHistoryHintKey(null), "historyHintEmpty");
    assert.equal(streakHistoryHintKey({ current_streak: 0 }), "historyHintEmpty");
  });

  it("keeps the started caption after any check-in signal", () => {
    assert.equal(
      streakHistoryHintKey({ current_streak: 1 }),
      "historyHint",
    );
    assert.equal(
      streakHistoryHintKey({ current_streak: 0, last_check_in_date: "2026-09-01" }),
      "historyHint",
    );
  });
});

describe("streakMilestoneSubKey", () => {
  it("avoids Premium-unlock copy before the first check-in", () => {
    assert.equal(streakMilestoneSubKey(undefined), "list.subBeforeCheckIn");
    assert.equal(streakMilestoneSubKey({ current_streak: 0 }), "list.subBeforeCheckIn");
  });

  it("keeps the earned / Premium blurb after a check-in", () => {
    assert.equal(
      streakMilestoneSubKey({ first_check_in_date: "2026-09-01" }),
      "list.sub",
    );
  });
});
