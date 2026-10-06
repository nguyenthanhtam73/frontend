import { apiGet, apiPut } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-token";

/** Body `push_opt_in_action` for PUT /api/v1/me/reminder. */
export type PushOptInAction = "skip_push_opt_in" | "consume_push_opt_in_reshow";

/** `data` from GET/PUT /api/v1/me/reminder. */
export type PushOptInReminder = {
  push_opt_in_skipped_at?: string;
  push_opt_in_reshow_eligible: boolean;
  push_opt_in_show_after_check_in_only?: boolean;
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
