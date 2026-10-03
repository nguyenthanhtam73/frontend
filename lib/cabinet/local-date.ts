/**
 * `YYYY-MM-DD` from the date's local calendar parts.
 * Do not use `toISOString()` — that is the UTC day, which is yesterday in
 * Vietnam (UTC+7) before 07:00.
 */
export function localDateInputValue(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Civil calendar for cabinet opened dates. ICT is UTC+7, so the date flips at 00:00 Vietnam, not 07:00. */
export const CABINET_TZ = "Asia/Ho_Chi_Minh";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** `YYYY-MM-DD` on the Vietnam calendar, independent of the browser timezone. */
export function vietnamDateKey(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CABINET_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  if (!year || !month || !day) {
    throw new Error("Could not format the Vietnam calendar day");
  }
  return `${year}-${month}-${day}`;
}

/**
 * Keep a picked opened date on or before today in Vietnam.
 * Empty and non-dates are left as entered so the field can be cleared.
 */
export function clampOpenedDate(value: string, today = vietnamDateKey()): string {
  const trimmed = value.trim();
  if (!ISO_DATE.test(trimmed)) return value;
  if (trimmed > today) return today;
  return trimmed;
}
