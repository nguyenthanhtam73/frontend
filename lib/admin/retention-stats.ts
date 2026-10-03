import type { AdminRetentionThresholdCounts } from "@/lib/types/admin-retention";

/** Display clock for `as_of`. Same UTC+7 offset as the Vietnam check-in calendar. */
export const RETENTION_DISPLAY_TZ = "Asia/Bangkok";

export const RETENTION_THRESHOLDS = [1, 2, 7, 14] as const;

export type RetentionThreshold = (typeof RETENTION_THRESHOLDS)[number];

export type AdminRetentionLoadError = "auth" | "forbidden" | "not_found" | "unknown";

export type RetentionShareRow = {
  threshold: RetentionThreshold;
  count: number;
  ofRegistered: string;
  ofCheckedIn: string;
};

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** True for a real calendar day written as YYYY-MM-DD. */
export function isIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** `from` after `to` is the only client-side range problem. Empty ends are allowed. */
export function retentionDateRangeIssue(from: string, to: string): "order" | null {
  if (!isIsoDate(from) || !isIsoDate(to)) return null;
  if (from > to) return "order";
  return null;
}

/** Query string for GET /api/v1/admin/retention-stats. Omits blank or invalid days. */
export function retentionStatsSearch(from: string, to: string): string {
  const params = new URLSearchParams();
  if (isIsoDate(from)) params.set("from", from);
  if (isIsoDate(to)) params.set("to", to);
  return params.toString();
}

/**
 * Share of `total`. Zero or missing totals stay blank so a 404-shaped
 * empty cohort does not render "NaN%".
 */
export function formatRetentionPercent(count: number, total: number): string {
  if (!Number.isFinite(count) || !Number.isFinite(total) || total <= 0) return "—";
  return `${((count / total) * 100).toFixed(1)}%`;
}

export function retentionShareRows(
  counts: AdminRetentionThresholdCounts,
  registered: number,
  checkedIn: number,
): RetentionShareRow[] {
  return RETENTION_THRESHOLDS.map((threshold) => {
    const count = counts[`at_least_${threshold}`];
    return {
      threshold,
      count,
      ofRegistered: formatRetentionPercent(count, registered),
      ofCheckedIn: formatRetentionPercent(count, checkedIn),
    };
  });
}

/** `as_of` on the Bangkok clock (UTC+7), independent of the browser timezone. */
export function formatRetentionAsOf(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, {
    timeZone: RETENTION_DISPLAY_TZ,
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function adminRetentionLoadError(error: unknown): AdminRetentionLoadError {
  if (error instanceof Error) {
    if (error.message === "auth") return "auth";
    if (error.message === "forbidden") return "forbidden";
    if (error.message === "not_found") return "not_found";
  }
  return "unknown";
}
