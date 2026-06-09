import {
  COACH_WELCOME_STORAGE_KEY,
  GUEST_COACH_PROFILE_ID,
  type CoachWelcomePayload,
} from "@/lib/types/starter-routine";

export function readCoachWelcomeSession(): CoachWelcomePayload | null {
  if (typeof window === "undefined") return null;
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

/** Guest preview must use session + preview-routine poll only — never /profile/skin. */
export function isGuestCoachSession(
  session: CoachWelcomePayload,
  hasToken: boolean,
): boolean {
  if (session.guestPreview === true) return true;
  if (session.profileId === GUEST_COACH_PROFILE_ID) return true;
  return !hasToken;
}

export function isCoachWelcomeRoutinePending(): boolean {
  return readCoachWelcomeSession()?.starterRoutinePending === true;
}
