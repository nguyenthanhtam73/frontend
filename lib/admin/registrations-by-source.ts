import { vietnamDateKey } from "@/lib/cabinet/local-date";
import type { AdminRegistrationSourceDay } from "@/lib/types/admin-registrations";

/** Same default zone as GET /api/v1/admin/stats/registrations-by-source. */
export const REGISTRATION_STATS_TZ = "Asia/Ho_Chi_Minh";

/** Inclusive start when the admin has not picked a date. */
export const REGISTRATIONS_SINCE_DAYS_AGO = 7;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

/** Shift a civil YYYY-MM-DD by whole days. Month and year boundaries follow UTC date math. */
export function shiftIsoDate(iso: string, deltaDays: number): string {
  if (!isIsoDate(iso)) throw new Error("invalid_since");
  const [year, month, day] = iso.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + deltaDays));
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Vietnam calendar day, `REGISTRATIONS_SINCE_DAYS_AGO` days before `now`. */
export function defaultRegistrationsSince(now: Date = new Date()): string {
  return shiftIsoDate(vietnamDateKey(now), -REGISTRATIONS_SINCE_DAYS_AGO);
}

export function registrationDayTotal(
  day: Pick<AdminRegistrationSourceDay, "tiktok" | "facebook" | "other" | "none">,
): number {
  return day.tiktok + day.facebook + day.other + day.none;
}

/**
 * Instant used to format a civil date in Asia/Ho_Chi_Minh.
 * 05:00 UTC is noon in Vietnam, so the calendar day does not shift.
 */
export function vietnamCivilNoon(iso: string): Date {
  if (!isIsoDate(iso)) throw new Error("invalid_since");
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 5, 0, 0));
}

/** Newest civil date first. Does not mutate the API array. */
export function registrationDaysNewestFirst(
  days: readonly AdminRegistrationSourceDay[],
): AdminRegistrationSourceDay[] {
  return [...days].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}
