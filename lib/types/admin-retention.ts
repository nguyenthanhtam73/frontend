/** GET /api/v1/admin/retention-stats — all-time (or registration-window) retention counts. */

export type AdminRetentionThresholdCounts = {
  at_least_1: number;
  at_least_2: number;
  at_least_7: number;
  at_least_14: number;
};

export type AdminRetentionDaysUsed = AdminRetentionThresholdCounts & {
  /** Largest distinct Vietnam check-in day count. 0 when nobody has checked in. */
  max_days: number;
};

export type AdminRetentionSignupWeek = {
  /** ISO week of the registration instant in Vietnam time, e.g. "2026-W37". */
  week: string;
  registered: number;
  /** At least one check-in day, not exactly one day. */
  checked_in_once: number;
  at_least_2_days: number;
  returned_next_day: number;
};

export type AdminRetentionStats = {
  registered_users: number;
  users_with_checkin: number;
  days_used: AdminRetentionDaysUsed;
  consecutive: AdminRetentionThresholdCounts;
  /** Checked in on the Vietnam day right after their first check-in day. */
  return_next_day: number;
  /** Null when the handler encodes an empty slice. */
  by_signup_week: AdminRetentionSignupWeek[] | null;
  /** Inclusive registration-day filter, or null for all time. */
  from: string | null;
  to: string | null;
  calendar: string;
  as_of: string;
};
