import { getAccessToken } from "@/lib/auth-token";
import {
  clearPersistedGuestRoutine,
  persistGuestRoutine,
  readPersistedGuestRoutine,
} from "@/lib/onboarding/guest-routine-persist";
import { mergeReviewPhotoUrls, normalizeReviewPhotoUrls } from "@/lib/onboarding/photo-session-urls";
import {
  COACH_WELCOME_SESSION_EVENT,
  COACH_WELCOME_STORAGE_KEY,
  GUEST_COACH_PROFILE_ID,
  type CoachWelcomePayload,
} from "@/lib/types/starter-routine";

function readSessionOnly(): CoachWelcomePayload | null {
  try {
    const raw = sessionStorage.getItem(COACH_WELCOME_STORAGE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw) as CoachWelcomePayload;
    if (!payload.starterRoutine) return null;
    return payload;
  } catch {
    return null;
  }
}

function writeSessionOnly(payload: CoachWelcomePayload): void {
  sessionStorage.setItem(COACH_WELCOME_STORAGE_KEY, JSON.stringify(payload));
}

/** Write session + durable guest backup (survives tab close). */
export function writeCoachWelcomeSession(payload: CoachWelcomePayload): void {
  if (typeof window === "undefined") return;
  try {
    writeSessionOnly(payload);
  } catch {
    /* quota — still keep the slim persist so the routine can be recovered */
  }
  persistGuestRoutine(payload);
}

/**
 * Restore a leftover guest trial into this tab (claim after register in a new tab).
 * Do not call for general reads on a signed-in account.
 */
export function hydratePersistedGuestSession(): CoachWelcomePayload | null {
  if (typeof window === "undefined") return null;
  const persisted = readPersistedGuestRoutine();
  if (!persisted) return null;
  try {
    writeSessionOnly(persisted);
  } catch {
    /* still return persist */
  }
  return persisted;
}

/**
 * Session first. Guest persist only hydrates when there is no JWT — never inject
 * a leftover trial into a signed-in account's working session.
 */
export function readCoachWelcomeSession(): CoachWelcomePayload | null {
  if (typeof window === "undefined") return null;
  const fromSession = readSessionOnly();
  if (fromSession) return fromSession;
  if (getAccessToken()) return null;

  return hydratePersistedGuestSession();
}

/** Session or persist — used only when claiming a guest trial onto an account. */
export function readClaimableGuestSession(): CoachWelcomePayload | null {
  if (typeof window === "undefined") return null;
  return readSessionOnly() ?? hydratePersistedGuestSession();
}

/** Guest preview must use session + preview-routine poll only — never /profile/skin. */
export function isGuestCoachSession(
  session: CoachWelcomePayload,
  hasToken: boolean,
): boolean {
  if (session.guestPreview === true) return true;
  if (session.profileId === GUEST_COACH_PROFILE_ID) return true;
  return !hasToken;
}

/** Drop coach-welcome session + guest photo IDB (leftover trial after auth). */
export function clearCoachWelcomeSession(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(COACH_WELCOME_STORAGE_KEY);
    window.dispatchEvent(
      new CustomEvent(COACH_WELCOME_SESSION_EVENT, { detail: {} }),
    );
  } catch {
    /* ignore */
  }
  clearPersistedGuestRoutine();
  void import("@/lib/onboarding/guest-photo-idb").then((m) =>
    m.clearGuestClaimPhotos(),
  );
}

export function isCoachWelcomeRoutinePending(): boolean {
  return readCoachWelcomeSession()?.starterRoutinePending === true;
}

export type PatchCoachWelcomeOptions = {
  /**
   * When true, `reviewSummary.photo_urls` replaces stored URLs even if empty
   * (claim sync). Default merge keeps local data URLs when a late patch sends [].
   */
  replacePhotoUrls?: boolean;
};

/** Merge a partial payload into sessionStorage and notify coach-welcome listeners. */
export function patchCoachWelcomeSession(
  patch: Partial<CoachWelcomePayload>,
  opts?: PatchCoachWelcomeOptions,
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem(COACH_WELCOME_STORAGE_KEY);
    if (!raw) return;
    const p = JSON.parse(raw) as CoachWelcomePayload;
    const mergedReviewSummary = patch.reviewSummary
      ? {
          ...p.reviewSummary,
          ...patch.reviewSummary,
          photo_urls: opts?.replacePhotoUrls
            ? normalizeReviewPhotoUrls(patch.reviewSummary.photo_urls)
            : mergeReviewPhotoUrls(
                p.reviewSummary?.photo_urls,
                patch.reviewSummary.photo_urls,
              ),
        }
      : p.reviewSummary;
    const merged: CoachWelcomePayload = {
      ...p,
      ...patch,
      reviewSummary: mergedReviewSummary,
    };
    sessionStorage.setItem(COACH_WELCOME_STORAGE_KEY, JSON.stringify(merged));
    persistGuestRoutine(merged);
    window.dispatchEvent(new CustomEvent(COACH_WELCOME_SESSION_EVENT, { detail: patch }));
  } catch {
    /* storage full or private mode */
  }
}
