/**
 * Pure helpers for GET/PUT /api/v1/me/reminder `schedule`.
 *
 * The server sends at most one capture reminder per local day and skips a day
 * the user already checked in. This module only shapes the clock the user
 * picks. A blank `time` is not sent: the live API treats it as "leave the
 * stored clock", not as a clear.
 */

export const DEFAULT_REMINDER_TIMEZONE = "Asia/Ho_Chi_Minh";

/**
 * Same Vietnam clock. Some browsers still resolve Ho Chi Minh as Asia/Saigon.
 */
const VIETNAM_TIMEZONE_ALIASES = new Set(["asia/ho_chi_minh", "asia/saigon"]);

/** Evening wall-clock shown until the user has saved their own time. */
export const DEFAULT_REMINDER_DISPLAY_TIME = "20:00";

export type ReminderSchedule = {
  enabled?: boolean;
  /** "HH:MM" in 00:00–23:59, when the user has saved one. */
  time?: string;
  /** IANA name, when one has been stored. */
  timezone?: string;
};

/** Fields PUT /api/v1/me/reminder accepts besides `push_opt_in_action`. */
export type ReminderScheduleUpdate = {
  enabled?: boolean;
  time?: string;
  timezone?: string;
};

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

/** "HH:MM" (optional seconds stripped). Null when blank or out of range. */
export function normalizeReminderTime(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const match = TIME_RE.exec(raw.trim());
  if (!match) return null;
  return `${match[1]}:${match[2]}`;
}

/**
 * True for an IANA name the runtime can resolve. "Local" is rejected, matching
 * the API. Empty and overlong names are rejected.
 */
export function isAcceptableReminderTimezone(raw: string | null | undefined): boolean {
  if (typeof raw !== "string") return false;
  const name = raw.trim();
  if (!name || name.length > 64 || name.toLowerCase() === "local") return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: name }).format();
    return true;
  } catch {
    return false;
  }
}

/** Known IANA zone, or Asia/Ho_Chi_Minh when the browser zone is missing. */
export function resolveReminderTimezone(raw: string | null | undefined): string {
  if (!isAcceptableReminderTimezone(raw)) return DEFAULT_REMINDER_TIMEZONE;
  const name = raw!.trim();
  if (VIETNAM_TIMEZONE_ALIASES.has(name.toLowerCase())) return DEFAULT_REMINDER_TIMEZONE;
  return name;
}

/**
 * Browser zone, falling back to Asia/Ho_Chi_Minh.
 * Pass `resolved` in tests; omit it to read `Intl` resolvedOptions.
 */
export function browserReminderTimezone(resolved?: string | null): string {
  const fromBrowser =
    resolved !== undefined
      ? resolved
      : typeof Intl !== "undefined"
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : null;
  return resolveReminderTimezone(fromBrowser);
}

export function reminderTimezoneKind(zone: string): "vietnam" | "device" {
  return resolveReminderTimezone(zone) === DEFAULT_REMINDER_TIMEZONE ? "vietnam" : "device";
}

/**
 * NULL / never-saved stays on the server's fixed clocks, so the switch reads
 * as on. Only an explicit `enabled: false` mutes capture reminders.
 */
export function isReminderScheduleOn(
  schedule: ReminderSchedule | null | undefined,
): boolean {
  return schedule?.enabled !== false;
}

export function readReminderSchedule(
  view: { schedule?: ReminderSchedule | null } | null | undefined,
): ReminderSchedule | null {
  const schedule = view?.schedule;
  if (!schedule || typeof schedule !== "object") return null;
  const next: ReminderSchedule = {};
  if (typeof schedule.enabled === "boolean") next.enabled = schedule.enabled;
  const time = normalizeReminderTime(schedule.time);
  if (time) next.time = time;
  if (typeof schedule.timezone === "string" && isAcceptableReminderTimezone(schedule.timezone)) {
    next.timezone = schedule.timezone.trim();
  }
  return Object.keys(next).length > 0 ? next : null;
}

export function reminderTimeInputValue(schedule: ReminderSchedule | null | undefined): string {
  return normalizeReminderTime(schedule?.time) ?? DEFAULT_REMINDER_DISPLAY_TIME;
}

/**
 * Drop blank time (the API ignores it) and refuse an invalid clock so a bad
 * value never rides along with `enabled` or `timezone`.
 */
export function compactReminderSchedulePatch(
  patch: ReminderScheduleUpdate,
): ReminderScheduleUpdate | null {
  const body: ReminderScheduleUpdate = {};
  if (typeof patch.enabled === "boolean") body.enabled = patch.enabled;
  if (patch.time !== undefined && patch.time.trim() !== "") {
    const time = normalizeReminderTime(patch.time);
    if (!time) return null;
    body.time = time;
  }
  if (patch.timezone !== undefined && patch.timezone.trim() !== "") {
    body.timezone = resolveReminderTimezone(patch.timezone);
  }
  return Object.keys(body).length > 0 ? body : null;
}

/** Toggle only. Omits time and timezone so a mute does not rewrite the clock. */
export function buildReminderEnabledPut(
  nextEnabled: boolean,
  previous: ReminderSchedule | null | undefined,
): ReminderScheduleUpdate | null {
  if (nextEnabled) {
    return previous?.enabled === false ? { enabled: true } : null;
  }
  return previous?.enabled === false ? null : { enabled: false };
}

/**
 * Save the picked clock. Includes `enabled: true` when the row is not already
 * on, because a saved time only replaces the fixed clocks when both are set.
 * Unchanged fields are omitted.
 */
export function buildDailyReminderTimePut(input: {
  time: string;
  timezone: string;
  previous: ReminderSchedule | null | undefined;
}): ReminderScheduleUpdate | null {
  const time = normalizeReminderTime(input.time);
  if (!time) return null;
  const zone = resolveReminderTimezone(input.timezone);
  const body: ReminderScheduleUpdate = {};
  if (input.previous?.enabled !== true) body.enabled = true;
  if (normalizeReminderTime(input.previous?.time) !== time) body.time = time;
  const previousZone = input.previous?.timezone?.trim();
  if (!previousZone || resolveReminderTimezone(previousZone) !== zone) {
    body.timezone = zone;
  }
  return Object.keys(body).length > 0 ? body : null;
}

export function reminderTimeDraftDirty(input: {
  time: string;
  timezone: string;
  previous: ReminderSchedule | null | undefined;
}): boolean {
  return buildDailyReminderTimePut(input) !== null;
}
