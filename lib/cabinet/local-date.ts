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
