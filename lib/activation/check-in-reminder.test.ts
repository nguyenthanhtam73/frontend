import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  dismissDayFromMap,
  hasCheckedInToday,
  kindFromServerCheckInReminder,
  resolveCheckInReminderKind,
  resolvePreferredCheckInReminderKind,
  shouldShowDailyCheckInReminder,
  signupDayKey,
} from "./check-in-reminder";

describe("signupDayKey", () => {
  it("maps RFC3339 created_at onto the Vietnam calendar day", () => {
    // 2026-09-04 22:30 UTC = 2026-09-05 05:30 in Asia/Ho_Chi_Minh
    assert.equal(signupDayKey("2026-09-04T22:30:00.000Z"), "2026-09-05");
    assert.equal(signupDayKey("2026-09-05T00:00:00+07:00"), "2026-09-05");
  });

  it("returns null for missing or invalid timestamps", () => {
    assert.equal(signupDayKey(null), null);
    assert.equal(signupDayKey(""), null);
    assert.equal(signupDayKey("not-a-date"), null);
  });
});

describe("hasCheckedInToday", () => {
  it("is true only when last_check_in_date matches today", () => {
    assert.equal(
      hasCheckedInToday({ last_check_in_date: "2026-09-05" }, "2026-09-05"),
      true,
    );
    assert.equal(
      hasCheckedInToday({ last_check_in_date: "2026-09-04" }, "2026-09-05"),
      false,
    );
    assert.equal(hasCheckedInToday({ current_streak: 3 }, "2026-09-05"), false);
    assert.equal(hasCheckedInToday(null, "2026-09-05"), false);
  });
});

describe("resolveCheckInReminderKind", () => {
  const today = "2026-09-05";

  it("hides when the user already checked in today", () => {
    assert.equal(
      resolveCheckInReminderKind({
        today,
        signupDay: today,
        streak: { current_streak: 1, last_check_in_date: today },
      }),
      null,
    );
  });

  it("uses D0 on signup day (or unknown created_at) with no check-in yet", () => {
    assert.equal(
      resolveCheckInReminderKind({
        today,
        signupDay: today,
        streak: { current_streak: 0 },
      }),
      "d0",
    );
    assert.equal(
      resolveCheckInReminderKind({
        today,
        signupDay: null,
        streak: null,
      }),
      "d0",
    );
  });

  it("uses D1 the next calendar day if still no first check-in", () => {
    assert.equal(
      resolveCheckInReminderKind({
        today,
        signupDay: "2026-09-04",
        streak: { current_streak: 0 },
      }),
      "d1",
    );
  });

  it("uses D1 when they have history but no check-in yesterday or today", () => {
    assert.equal(
      resolveCheckInReminderKind({
        today,
        signupDay: "2026-08-01",
        streak: {
          current_streak: 0,
          last_check_in_date: "2026-09-02",
          first_check_in_date: "2026-08-02",
        },
      }),
      "d1",
    );
  });

  it("uses keep when yesterday was checked in (or server at-risk)", () => {
    assert.equal(
      resolveCheckInReminderKind({
        today,
        signupDay: "2026-08-01",
        streak: {
          current_streak: 4,
          last_check_in_date: "2026-09-04",
          first_check_in_date: "2026-08-02",
        },
      }),
      "keep",
    );
    assert.equal(
      resolveCheckInReminderKind({
        today,
        signupDay: "2026-08-01",
        streak: {
          current_streak: 2,
          last_check_in_date: "2026-09-03",
          is_at_risk: true,
        },
      }),
      "keep",
    );
  });
});

describe("shouldShowDailyCheckInReminder", () => {
  const base = {
    signedIn: true,
    dismissedToday: false,
    onFunnelPath: false,
    onCheckInPath: false,
    onCoachWelcomePath: false,
    streakStatus: "ready" as const,
    kind: "d0" as const,
  };

  it("shows a ready D0/D1/keep reminder off the funnel", () => {
    assert.equal(shouldShowDailyCheckInReminder(base), true);
    assert.equal(shouldShowDailyCheckInReminder({ ...base, kind: "d1" }), true);
    assert.equal(shouldShowDailyCheckInReminder({ ...base, kind: "keep" }), true);
  });

  it("hides when dismissed today, unsigned, or already on check-in/funnel", () => {
    assert.equal(
      shouldShowDailyCheckInReminder({ ...base, dismissedToday: true }),
      false,
    );
    assert.equal(
      shouldShowDailyCheckInReminder({ ...base, signedIn: false }),
      false,
    );
    assert.equal(
      shouldShowDailyCheckInReminder({ ...base, onFunnelPath: true }),
      false,
    );
    assert.equal(
      shouldShowDailyCheckInReminder({ ...base, onCheckInPath: true }),
      false,
    );
    assert.equal(
      shouldShowDailyCheckInReminder({ ...base, onCoachWelcomePath: true }),
      false,
    );
  });

  it("waits for a real streak payload and hides when there is no kind", () => {
    assert.equal(
      shouldShowDailyCheckInReminder({ ...base, streakStatus: "loading" }),
      false,
    );
    assert.equal(
      shouldShowDailyCheckInReminder({ ...base, streakStatus: "error" }),
      false,
    );
    assert.equal(
      shouldShowDailyCheckInReminder({ ...base, kind: null }),
      false,
    );
  });

  it("can show a server-backed kind before streak finishes", () => {
    assert.equal(
      shouldShowDailyCheckInReminder({
        ...base,
        streakStatus: "loading",
        reminderStatus: "ready",
        kind: "d0",
      }),
      true,
    );
    assert.equal(
      shouldShowDailyCheckInReminder({
        ...base,
        streakStatus: "error",
        reminderStatus: "ready",
        kind: "d1",
      }),
      true,
    );
  });
});

describe("kindFromServerCheckInReminder", () => {
  const dueD0 = {
    kind: "d0",
    due: true,
    signup_date: "2026-09-05",
    days_since_signup: 0,
    checked_in_today: false,
    channels: {
      in_app: true,
      email: false,
      push_evening: true,
      push_d0_d1_specific: false,
    },
  };

  it("returns d0/d1 only when due and not already checked in today", () => {
    assert.equal(kindFromServerCheckInReminder(dueD0), "d0");
    assert.equal(kindFromServerCheckInReminder({ ...dueD0, kind: "d1" }), "d1");
    assert.equal(
      kindFromServerCheckInReminder({ ...dueD0, kind: "D0" }),
      "d0",
    );
  });

  it("returns null when due is false, already checked in, or kind is none", () => {
    assert.equal(
      kindFromServerCheckInReminder({ ...dueD0, due: false }),
      null,
    );
    assert.equal(
      kindFromServerCheckInReminder({
        ...dueD0,
        due: false,
        checked_in_today: true,
      }),
      null,
    );
    assert.equal(
      kindFromServerCheckInReminder({ ...dueD0, kind: "none", due: false }),
      null,
    );
    assert.equal(
      kindFromServerCheckInReminder({ ...dueD0, kind: "none", due: true }),
      null,
    );
  });

  it("returns undefined for an unusable payload so callers can fall back", () => {
    assert.equal(kindFromServerCheckInReminder(null), undefined);
    assert.equal(kindFromServerCheckInReminder(undefined), undefined);
    assert.equal(kindFromServerCheckInReminder({ kind: "d0" }), undefined);
    assert.equal(kindFromServerCheckInReminder("d0"), undefined);
  });
});

describe("resolvePreferredCheckInReminderKind", () => {
  const dueD0 = {
    kind: "d0",
    due: true,
    days_since_signup: 0,
    checked_in_today: false,
    channels: { in_app: true, email: false, push_evening: false, push_d0_d1_specific: false },
  };
  const notDue = {
    kind: "none",
    due: false,
    days_since_signup: 3,
    checked_in_today: false,
    channels: { in_app: true, email: false, push_evening: false, push_d0_d1_specific: false },
  };

  it("prefers server d0/d1 when the request succeeded", () => {
    assert.equal(
      resolvePreferredCheckInReminderKind({
        reminderStatus: "ready",
        serverData: dueD0,
        clientKind: "keep",
      }),
      "d0",
    );
    assert.equal(
      resolvePreferredCheckInReminderKind({
        reminderStatus: "ready",
        serverData: { ...dueD0, kind: "d1" },
        clientKind: "d0",
      }),
      "d1",
    );
  });

  it("hides D0/D1 when the server says not due, but keeps client keep", () => {
    assert.equal(
      resolvePreferredCheckInReminderKind({
        reminderStatus: "ready",
        serverData: notDue,
        clientKind: "d1",
      }),
      null,
    );
    assert.equal(
      resolvePreferredCheckInReminderKind({
        reminderStatus: "ready",
        serverData: notDue,
        clientKind: "keep",
      }),
      "keep",
    );
  });

  it("falls back to the client kind while loading, on error, or bad payload", () => {
    assert.equal(
      resolvePreferredCheckInReminderKind({
        reminderStatus: "loading",
        serverData: undefined,
        clientKind: "d0",
      }),
      "d0",
    );
    assert.equal(
      resolvePreferredCheckInReminderKind({
        reminderStatus: "error",
        serverData: undefined,
        clientKind: "d1",
      }),
      "d1",
    );
    assert.equal(
      resolvePreferredCheckInReminderKind({
        reminderStatus: "ready",
        serverData: { kind: "d0" },
        clientKind: "keep",
      }),
      "keep",
    );
  });
});

describe("dismissDayFromMap", () => {
  it("reads a YYYY-MM-DD dismiss day per user", () => {
    assert.equal(
      dismissDayFromMap({ u1: "2026-09-05", u2: "nope" }, "u1"),
      "2026-09-05",
    );
    assert.equal(dismissDayFromMap({ u1: "2026-09-05" }, "u2"), null);
    assert.equal(dismissDayFromMap(null, "u1"), null);
  });
});
