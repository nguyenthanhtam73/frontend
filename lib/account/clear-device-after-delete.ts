import { clearAccessToken } from "@/lib/auth-token";
import { clearAppCaches } from "@/lib/clear-app-caches";
import { clearLocalUserData } from "@/lib/clear-local-user-data";
import { ONBOARDING_GUEST_TRIAL_COOKIE } from "@/lib/onboarding/constants";
import { PUSH_CLICK_DB_NAME } from "@/lib/push/click-queue";
import { clearGuestOnboardingTrial } from "@/lib/stores/onboarding-store";
import { useAuthStore } from "@/lib/stores/auth-store";

/** Guest drafts on this device. Any new `dadiary_guest*` key is removed too. */
export const GUEST_STORAGE_PREFIX = "dadiary_guest";

export const GUEST_CHECKIN_STORAGE_KEY = "dadiary_guest_checkin_v1";
export const GUEST_ROUTINE_STORAGE_KEY = "dadiary_guest_routine_v1";

/** IndexedDB names that can hold guest face photos. */
export const GUEST_INDEXED_DB_NAMES = [
  "dadiary_guest_checkin_photos_v1",
  "dadiary_guest_photos_v1",
] as const;

const EXPLICIT_GUEST_KEYS = [
  GUEST_CHECKIN_STORAGE_KEY,
  GUEST_ROUTINE_STORAGE_KEY,
  ONBOARDING_GUEST_TRIAL_COOKIE,
] as const;

/**
 * Reminder and push opt-in flags kept on this device.
 * The opt-in card itself is server state (`PUT skip_push_opt_in`); these
 * keys are the local copies (nudge, reminder dismiss, push preference).
 */
export const REMINDER_PUSH_OPT_IN_STORAGE_KEYS = [
  "dadiary:checkin-reminder-dismiss-v1",
  "dadiary:push-nudge-v1",
  "dadiary_push_enabled",
  "dadiary_push_vapid_pub",
  "dadiary:awaiting-first-checkin-v1",
  "dadiary:first-checkin-later-today-v1",
  "dadiary_awaiting_first_checkin_v1",
  "dadiary:last-push-url",
  "dadiary:last-push-message-id",
] as const;

const REMINDER_PUSH_OPT_IN_PREFIXES = [
  "dadiary:checkin-reminder",
  "dadiary:push-nudge",
  "dadiary_push_",
  "dadiary:awaiting-first-checkin",
  "dadiary:first-checkin-later",
  "dadiary_awaiting_first_checkin",
  "dadiary:last-push-",
] as const;

function removeMatchingKeys(
  storage: Storage | undefined,
  prefixes: readonly string[],
  explicit: readonly string[],
): void {
  if (!storage) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && prefixes.some((prefix) => key.startsWith(prefix))) keys.push(key);
    }
    for (const key of keys) storage.removeItem(key);
    for (const key of explicit) storage.removeItem(key);
  } catch {
    /* private mode */
  }
}

function removePrefixedKeys(storage: Storage | undefined, prefix: string): void {
  removeMatchingKeys(storage, [prefix], EXPLICIT_GUEST_KEYS);
}

/** Drop local reminder dismissals and push opt-in flags. No network. */
export function clearReminderAndPushOptInStorage(): void {
  if (typeof window === "undefined") return;
  removeMatchingKeys(
    window.localStorage,
    REMINDER_PUSH_OPT_IN_PREFIXES,
    REMINDER_PUSH_OPT_IN_STORAGE_KEYS,
  );
  removeMatchingKeys(
    window.sessionStorage,
    REMINDER_PUSH_OPT_IN_PREFIXES,
    REMINDER_PUSH_OPT_IN_STORAGE_KEYS,
  );
}

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve();
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.deleteDatabase(name);
    } catch {
      resolve();
      return;
    }
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    request.onsuccess = done;
    request.onerror = done;
    request.onblocked = done;
  });
}

/** Drop guest check-in, guest routine, and guest photo databases. No network. */
export async function clearGuestDeviceData(): Promise<void> {
  if (typeof window === "undefined") return;
  removePrefixedKeys(window.localStorage, GUEST_STORAGE_PREFIX);
  removePrefixedKeys(window.sessionStorage, GUEST_STORAGE_PREFIX);
  try {
    clearGuestOnboardingTrial();
  } catch {
    /* ignore */
  }
  await Promise.all(GUEST_INDEXED_DB_NAMES.map((name) => deleteDatabase(name)));
}

/**
 * After DELETE /api/v1/me returns 204 the account is already gone, so
 * POST /auth/logout and push unsubscribe would 401. Clear tokens and
 * device state only. Service-worker caches are dropped; the worker stays
 * registered.
 */
export async function clearDeviceAfterAccountDeletion(): Promise<void> {
  try {
    clearAccessToken();
  } catch {
    /* ignore */
  }
  try {
    clearLocalUserData();
  } catch {
    /* ignore */
  }
  try {
    useAuthStore.setState({ user: null, loading: false });
  } catch {
    /* ignore */
  }
  try {
    clearReminderAndPushOptInStorage();
  } catch {
    /* ignore */
  }
  await clearGuestDeviceData();
  await deleteDatabase(PUSH_CLICK_DB_NAME);
  try {
    await clearAppCaches();
  } catch {
    /* Cache Storage / service worker unavailable */
  }
}
