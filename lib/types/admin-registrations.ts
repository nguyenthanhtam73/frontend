/** GET /api/v1/admin/stats/registrations-by-source — daily signup counts. */
export type AdminRegistrationSourceDay = {
  /** Civil date YYYY-MM-DD in the response timezone. */
  date: string;
  tiktok: number;
  facebook: number;
  other: number;
  none: number;
};

/**
 * Aggregate counts only. Days with no signups are omitted.
 * No emails, user ids, click ids, or raw utm values.
 */
export type AdminRegistrationsBySource = {
  timezone: string;
  since: string;
  days: AdminRegistrationSourceDay[];
};
