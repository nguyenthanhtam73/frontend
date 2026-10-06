import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  DEFAULT_REMINDER_DISPLAY_TIME,
  DEFAULT_REMINDER_TIMEZONE,
  browserReminderTimezone,
  buildDailyReminderTimePut,
  buildReminderEnabledPut,
  compactReminderSchedulePatch,
  isAcceptableReminderTimezone,
  isReminderScheduleOn,
  normalizeReminderTime,
  readReminderSchedule,
  reminderTimeDraftDirty,
  reminderTimeInputValue,
  reminderTimezoneKind,
  resolveReminderTimezone,
} from "./schedule";

describe("normalizeReminderTime", () => {
  it("accepts HH:MM from 00:00 through 23:59 and strips seconds", () => {
    assert.equal(normalizeReminderTime("00:00"), "00:00");
    assert.equal(normalizeReminderTime("23:59"), "23:59");
    assert.equal(normalizeReminderTime(" 20:00 "), "20:00");
    assert.equal(normalizeReminderTime("08:05:00"), "08:05");
  });

  it("rejects blank, unpadded, and out-of-range clocks", () => {
    assert.equal(normalizeReminderTime(""), null);
    assert.equal(normalizeReminderTime("   "), null);
    assert.equal(normalizeReminderTime(null), null);
    assert.equal(normalizeReminderTime("9:00"), null);
    assert.equal(normalizeReminderTime("24:00"), null);
    assert.equal(normalizeReminderTime("20:60"), null);
    assert.equal(normalizeReminderTime("20:00:99"), null);
  });
});

describe("reminder timezone", () => {
  it("keeps a real IANA zone and falls back when the zone is unknown", () => {
    assert.equal(isAcceptableReminderTimezone("Asia/Ho_Chi_Minh"), true);
    assert.equal(isAcceptableReminderTimezone("America/New_York"), true);
    assert.equal(isAcceptableReminderTimezone("UTC"), true);
    assert.equal(isAcceptableReminderTimezone(""), false);
    assert.equal(isAcceptableReminderTimezone("Local"), false);
    assert.equal(isAcceptableReminderTimezone("local"), false);
    assert.equal(isAcceptableReminderTimezone("Not/AZone"), false);
    assert.equal(isAcceptableReminderTimezone("x".repeat(65)), false);

    assert.equal(resolveReminderTimezone("America/New_York"), "America/New_York");
    assert.equal(resolveReminderTimezone("Asia/Saigon"), DEFAULT_REMINDER_TIMEZONE);
    assert.equal(resolveReminderTimezone(""), DEFAULT_REMINDER_TIMEZONE);
    assert.equal(resolveReminderTimezone(null), DEFAULT_REMINDER_TIMEZONE);
    assert.equal(resolveReminderTimezone("Local"), DEFAULT_REMINDER_TIMEZONE);
    assert.equal(resolveReminderTimezone("Not/AZone"), DEFAULT_REMINDER_TIMEZONE);
  });

  it("reads an injected browser zone and labels Vietnam separately", () => {
    assert.equal(browserReminderTimezone("Asia/Ho_Chi_Minh"), "Asia/Ho_Chi_Minh");
    assert.equal(browserReminderTimezone(null), DEFAULT_REMINDER_TIMEZONE);
    assert.equal(browserReminderTimezone("Local"), DEFAULT_REMINDER_TIMEZONE);
    assert.equal(browserReminderTimezone("Europe/Paris"), "Europe/Paris");
    assert.equal(browserReminderTimezone("Asia/Saigon"), DEFAULT_REMINDER_TIMEZONE);
    assert.equal(reminderTimezoneKind("Asia/Ho_Chi_Minh"), "vietnam");
    assert.equal(reminderTimezoneKind("Asia/Saigon"), "vietnam");
    assert.equal(reminderTimezoneKind(""), "vietnam");
    assert.equal(reminderTimezoneKind("Europe/Paris"), "device");
  });
});

describe("schedule read and put bodies", () => {
  it("treats a missing schedule as still on the fixed clocks", () => {
    assert.equal(isReminderScheduleOn(null), true);
    assert.equal(isReminderScheduleOn({}), true);
    assert.equal(isReminderScheduleOn({ enabled: true, time: "20:00" }), true);
    assert.equal(isReminderScheduleOn({ enabled: false }), false);
    assert.equal(readReminderSchedule(null), null);
    assert.equal(readReminderSchedule({ schedule: null }), null);
    assert.equal(reminderTimeInputValue(null), DEFAULT_REMINDER_DISPLAY_TIME);
  });

  it("keeps a saved clock and drops a bad time", () => {
    assert.deepEqual(
      readReminderSchedule({
        schedule: {
          enabled: true,
          time: "21:15:00",
          timezone: "Asia/Ho_Chi_Minh",
        },
      }),
      { enabled: true, time: "21:15", timezone: "Asia/Ho_Chi_Minh" },
    );
    assert.deepEqual(readReminderSchedule({ schedule: { enabled: false, time: "99:00" } }), {
      enabled: false,
    });
  });

  it("omits a blank time and refuses an invalid one", () => {
    assert.deepEqual(compactReminderSchedulePatch({ enabled: false, time: "" }), {
      enabled: false,
    });
    assert.equal(compactReminderSchedulePatch({ time: "" }), null);
    assert.equal(compactReminderSchedulePatch({ time: "25:00", enabled: true }), null);
    assert.deepEqual(
      compactReminderSchedulePatch({ time: "20:00:30", timezone: "Local" }),
      { time: "20:00", timezone: DEFAULT_REMINDER_TIMEZONE },
    );
  });

  it("toggles enabled without rewriting the clock", () => {
    assert.deepEqual(buildReminderEnabledPut(false, null), { enabled: false });
    assert.deepEqual(buildReminderEnabledPut(false, { enabled: true, time: "20:00" }), {
      enabled: false,
    });
    assert.equal(buildReminderEnabledPut(false, { enabled: false }), null);
    assert.equal(buildReminderEnabledPut(true, null), null);
    assert.equal(buildReminderEnabledPut(true, { enabled: true }), null);
    assert.deepEqual(buildReminderEnabledPut(true, { enabled: false, time: "20:00" }), {
      enabled: true,
    });
  });

  it("sends a first saved time with enabled and timezone, then only the clock", () => {
    assert.deepEqual(
      buildDailyReminderTimePut({
        time: "20:00",
        timezone: "Asia/Ho_Chi_Minh",
        previous: null,
      }),
      { enabled: true, time: "20:00", timezone: "Asia/Ho_Chi_Minh" },
    );
    assert.deepEqual(
      buildDailyReminderTimePut({
        time: "20:00",
        timezone: "Asia/Saigon",
        previous: null,
      }),
      { enabled: true, time: "20:00", timezone: "Asia/Ho_Chi_Minh" },
    );
    assert.deepEqual(
      buildDailyReminderTimePut({
        time: "21:30",
        timezone: "Asia/Ho_Chi_Minh",
        previous: { enabled: true, time: "20:00", timezone: "Asia/Ho_Chi_Minh" },
      }),
      { time: "21:30" },
    );
    assert.equal(
      buildDailyReminderTimePut({
        time: "20:00",
        timezone: "Asia/Ho_Chi_Minh",
        previous: { enabled: true, time: "20:00", timezone: "Asia/Ho_Chi_Minh" },
      }),
      null,
    );
    assert.equal(
      reminderTimeDraftDirty({
        time: "",
        timezone: "Asia/Ho_Chi_Minh",
        previous: null,
      }),
      false,
    );
  });

  it("includes timezone when the device zone differs from the saved one", () => {
    assert.deepEqual(
      buildDailyReminderTimePut({
        time: "20:00",
        timezone: "Europe/Paris",
        previous: { enabled: true, time: "20:00", timezone: "Asia/Ho_Chi_Minh" },
      }),
      { timezone: "Europe/Paris" },
    );
  });
});
