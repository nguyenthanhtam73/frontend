import { apiGet, apiPut } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-token";
import {
  buildDailyReminderTimePut,
  compactReminderSchedulePatch,
  type ReminderSchedule,
  type ReminderScheduleUpdate,
} from "@/lib/reminder/schedule";

export type { ReminderSchedule, ReminderScheduleUpdate };

/** Body `push_opt_in_action` for PUT /api/v1/me/reminder. */
export type PushOptInAction = "skip_push_opt_in" | "consume_push_opt_in_reshow";

/**
 * `data` from GET/PUT /api/v1/me/reminder.
 * `schedule` is omitted until the user has saved a clock, a mute, or a zone.
 * Push opt-in callers can keep ignoring it.
 */
export type PushOptInReminder = {
  push_opt_in_skipped_at?: string;
  push_opt_in_reshow_eligible: boolean;
  push_opt_in_show_after_check_in_only?: boolean;
  schedule?: ReminderSchedule | null;
};

/** GET /api/v1/me/reminder. Guests (no access token) are a no-op. */
export async function fetchPushOptInReminder(): Promise<PushOptInReminder | null> {
  if (!getAccessToken()) return null;
  try {
    return await apiGet<PushOptInReminder>("/api/v1/me/reminder", {
      toastOnError: false,
    });
  } catch {
    return null;
  }
}

async function putPushOptInAction(
  action: PushOptInAction,
): Promise<PushOptInReminder | null> {
  if (!getAccessToken()) return null;
  try {
    return await apiPut<PushOptInReminder>(
      "/api/v1/me/reminder",
      { push_opt_in_action: action },
      { toastOnError: false },
    );
  } catch {
    return null;
  }
}

/** Explicit "Để sau" / Later. Idempotent on the server. */
export function skipPushOptIn(): Promise<PushOptInReminder | null> {
  return putPushOptInAction("skip_push_opt_in");
}

/** Mark the one-time post-check-in card as shown. Idempotent on the server. */
export function consumePushOptInReshow(): Promise<PushOptInReminder | null> {
  return putPushOptInAction("consume_push_opt_in_reshow");
}

/**
 * PUT only the schedule fields that changed. Does not send `push_opt_in_action`.
 * Guests (no access token) are a no-op. A blank or invalid time is not sent.
 */
export async function updateReminderSchedule(
  patch: ReminderScheduleUpdate,
): Promise<PushOptInReminder | null> {
  if (!getAccessToken()) return null;
  const body = compactReminderSchedulePatch(patch);
  if (!body) return null;
  try {
    return await apiPut<PushOptInReminder>("/api/v1/me/reminder", body, {
      toastOnError: false,
    });
  } catch {
    return null;
  }
}

/** Save the daily capture clock. Same route as push opt-in, schedule fields only. */
export function commitDailyReminderTime(input: {
  time: string;
  timezone: string;
  previous: ReminderSchedule | null | undefined;
}): Promise<PushOptInReminder | null> {
  const body = buildDailyReminderTimePut(input);
  if (!body) return Promise.resolve(null);
  return updateReminderSchedule(body);
}
