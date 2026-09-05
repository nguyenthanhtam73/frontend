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

/** Write session + durable guest backup (survives tab close). */
export function writeCoachWelcomeSession(payload: CoachWelcomePayload): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(COACH_WELCOME_STORAGE_KEY, JSON.stringify(payload));
  persistGuestRoutine(payload);
}

export function readCoachWelcomeSession(): CoachWelcomePayload | null {
  if (typeof window === "undefined") return null;
  const fromSession = readSessionOnly();
  if (fromSession) return fromSession;

  const persisted = readPersistedGuestRoutine();
  if (!persisted) return null;
  try {
    sessionStorage.setItem(COACH_WELCOME_STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    /* quota — still return persist so this tab can show the routine */
  }
  return persisted;
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
