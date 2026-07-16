/**
 * Clear Web Push on logout / account switch so the next user on a shared
 * browser does not inherit a stale subscription or local "enabled" pref.
 *
 * Multi-device rule: backend stores one active subscription per user.
 * Unsubscribing by user_id would kill the *other* device's reminders if this
 * browser is not the delivery target — so we only hit the API when local
 * PushManager endpoint === account endpoint.
 */

import { fetchActivePushSubscription, unsubscribePush } from "@/lib/api/push";
import { getAccessToken } from "@/lib/auth-token";
import {
  getBrowserPushEndpoint,
  logPushError,
  removeBrowserPushSubscription,
  setLocalPushEnabled,
} from "@/lib/web-push";

/**
 * Best-effort logout cleanup:
 *   - Same device as account subscription → DELETE /unsubscribe (stops pushes)
 *     then drop local PushManager sub + pref.
 *   - Other device / no local match → local clear only (pref + browser sub).
 *     Account row stays so the phone (or other device) keeps receiving reminders.
 *
 * Safe to call when already logged out (skips API, still clears local).
 * Account wipe (`deleteAllUserData`) still deletes push rows in DB regardless.
 */
export async function clearPushSubscriptionOnLogout(): Promise<void> {
  if (getAccessToken()) {
    try {
      const [active, localEndpoint] = await Promise.all([
        fetchActivePushSubscription(),
        getBrowserPushEndpoint(),
      ]);

      const accountEndpoint =
        active?.is_active === true ? (active.endpoint?.trim() || null) : null;
      const local = localEndpoint?.trim() || null;

      // Only touch DB when this browser owns the account subscription.
      if (accountEndpoint && local && local === accountEndpoint) {
        await unsubscribePush();
      }
    } catch (err) {
      // Network / already-unsubscribed / 404 — still clear the browser side.
      logPushError("clearPushSubscriptionOnLogout", err);
    }
  }

  try {
    await removeBrowserPushSubscription();
  } catch (err) {
    logPushError("clearPushSubscriptionOnLogout.local", err);
  }

  setLocalPushEnabled(false);
}
