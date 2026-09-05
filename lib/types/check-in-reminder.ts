/**
 * GET /api/v1/me/check-in-reminder — `data` envelope.
 *
 * Backend (`internal/dto/checkin_reminder.go`): live D0/D1 recompute.
 * `kind` is only `d0` | `d1` | `none`. `due` is true only for an active
 * account on signup day or the next Vietnam civil day with no check-in today.
 * `kind=none` is not an error (day 2+ after signup).
 */

export type ServerCheckInReminderKind = "d0" | "d1" | "none";

/** Delivery-path flags. Email stays false until an ESP is wired. */
export type CheckInReminderChannelsDTO = {
  in_app: boolean;
  email: boolean;
  push_evening: boolean;
  push_d0_d1_specific: boolean;
  email_reason?: string;
  push_note?: string;
};

export type CheckInReminderDTO = {
  kind: ServerCheckInReminderKind | string;
  due: boolean;
  /** YYYY-MM-DD (Vietnam calendar), omitted when signup time is unknown. */
  signup_date?: string;
  days_since_signup: number;
  checked_in_today: boolean;
  channels: CheckInReminderChannelsDTO;
};
