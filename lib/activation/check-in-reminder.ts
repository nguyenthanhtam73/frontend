/**
 * D0/D1 in-app check-in reminders + today-scoped soft dismiss.
 * Uses Vietnam calendar days (same TZ as streak APIs). No push/email here.
 */

import { streakDateKey, shiftDateKey } from "@/lib/streak/history";

import { hasNeverCheckedIn, type FirstCheckInStreakHint } from "./first-check-in";

const DISMISS_KEY = "dadiary:checkin-reminder-dismiss-v1";

export type CheckInReminderKind = "d0" | "d1" | "keep";

export type StreakReminderHint = FirstCheckInStreakHint & {
  is_at_risk?: boolean;
  current_streak?: number | null;
};

/** Vietnam calendar day of account creation, or null if missing/invalid. */
export function signupDayKey(createdAt?: string | null): string | null {
  if (!createdAt?.trim()) return null;
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return null;
  return streakDateKey(d);
}

export function hasCheckedInOnDay(
  lastCheckInDate: string | null | undefined,
  day: string,
): boolean {
  const last = lastCheckInDate?.trim();
  return Boolean(last && last === day);
}

export function hasCheckedInToday(
  streak: StreakReminderHint | null | undefined,
  today: string,
): boolean {
  return hasCheckedInOnDay(streak?.last_check_in_date, today);
}

/**
 * Which reminder to show when the user has not checked in today.
 *
 * - d0 — signup / first calendar day (or created_at unknown) and never checked in
 * - d1 — still no first check-in after signup day, or no check-in yesterday
 * - keep — checked in yesterday (or server at-risk) and streak is still alive
 * - null — already checked in today
 */
export function resolveCheckInReminderKind(input: {
  today: string;
  signupDay: string | null;
  streak: StreakReminderHint | null | undefined;
}): CheckInReminderKind | null {
  if (hasCheckedInToday(input.streak, input.today)) return null;

  const never = hasNeverCheckedIn(input.streak);
  const yesterday = shiftDateKey(input.today, -1);
  const last = input.streak?.last_check_in_date?.trim() || null;
  const streakN = input.streak?.current_streak ?? 0;

  if (never) {
    if (!input.signupDay || input.signupDay === input.today) return "d0";
    return "d1";
  }

  if (last === yesterday || (input.streak?.is_at_risk === true && streakN > 0)) {
    return "keep";
  }

  return "d1";
}

export function shouldShowDailyCheckInReminder(input: {
  signedIn: boolean;
  dismissedToday: boolean;
  onFunnelPath: boolean;
  onCheckInPath: boolean;
  onCoachWelcomePath: boolean;
  streakStatus: "loading" | "ready" | "error";
  kind: CheckInReminderKind | null;
}): boolean {
  if (!input.signedIn || input.dismissedToday) return false;
  if (input.onFunnelPath || input.onCheckInPath || input.onCoachWelcomePath) {
    return false;
  }
  if (input.streakStatus !== "ready") return false;
  return input.kind !== null;
}

type DismissMap = Record<string, string>;

function readDismissMap(): DismissMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out: DismissMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function readReminderDismissedDay(userId: string): string | null {
  const id = userId.trim();
  if (!id) return null;
  return readDismissMap()[id] ?? null;
}

export function writeReminderDismissedDay(userId: string, day: string): void {
  if (typeof window === "undefined") return;
  const id = userId.trim();
  if (!id || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
  try {
    const next = { ...readDismissMap(), [id]: day };
    window.localStorage.setItem(DISMISS_KEY, JSON.stringify(next));
  } catch {
    /* private mode / quota */
  }
}

export function isReminderDismissedToday(userId: string, today: string): boolean {
  return readReminderDismissedDay(userId) === today;
}

/** Parse helpers for unit tests (no window). */
export function dismissDayFromMap(
  raw: unknown,
  userId: string,
): string | null {
  if (!raw || typeof raw !== "object") return null;
  const value = (raw as Record<string, unknown>)[userId];
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? value
    : null;
}
