import { GUEST_COACH_PROFILE_ID, type CoachWelcomePayload } from "@/lib/types/starter-routine";

/** Survives tab close so guests can still see + save the routine they just got. */
export const GUEST_ROUTINE_PERSIST_KEY = "dadiary_guest_routine_v1";

const GUEST_ROUTINE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

type PersistedGuestRoutine = {
  savedAt: number;
  payload: CoachWelcomePayload;
};

/**
 * Claim-safe leftover only: routine steps + skin labels.
 * Never persist photos, vision notes, or preview secrets — localStorage lasts
 * across tabs and other people on the same browser.
 */
export function slimGuestRoutinePayload(
  payload: CoachWelcomePayload,
): CoachWelcomePayload {
  return {
    profileId: payload.profileId ?? GUEST_COACH_PROFILE_ID,
    guestPreview: true,
    starterRoutine: payload.starterRoutine,
    starterRoutinePending: false,
    usedDefaultRoutine: payload.usedDefaultRoutine,
    locale: payload.locale,
    guestPhotosIdb: payload.guestPhotosIdb === true ? true : undefined,
    reviewSummary: payload.reviewSummary
      ? {
          skin_type: payload.reviewSummary.skin_type,
          undertone: payload.reviewSummary.undertone,
          goal: payload.reviewSummary.goal,
          skill_level: payload.reviewSummary.skill_level,
          body_concerns: payload.reviewSummary.body_concerns,
          completed_at: payload.reviewSummary.completed_at,
          photos_skipped: payload.reviewSummary.photos_skipped,
        }
      : undefined,
  };
}

export function persistGuestRoutine(payload: CoachWelcomePayload): void {
  if (typeof window === "undefined") return;
  if (payload.guestPreview !== true && payload.profileId !== GUEST_COACH_PROFILE_ID) {
    return;
  }
  if (!payload.starterRoutine) return;
  try {
    const record: PersistedGuestRoutine = {
      savedAt: Date.now(),
      payload: slimGuestRoutinePayload(payload),
    };
    localStorage.setItem(GUEST_ROUTINE_PERSIST_KEY, JSON.stringify(record));
  } catch {
    /* private mode / quota */
  }
}

export function readPersistedGuestRoutine(): CoachWelcomePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(GUEST_ROUTINE_PERSIST_KEY);
    if (!raw) return null;
    const record = JSON.parse(raw) as PersistedGuestRoutine;
    if (!record?.payload?.starterRoutine) {
      localStorage.removeItem(GUEST_ROUTINE_PERSIST_KEY);
      return null;
    }
    if (
      !Number.isFinite(record.savedAt) ||
      Date.now() - record.savedAt > GUEST_ROUTINE_TTL_MS
    ) {
      localStorage.removeItem(GUEST_ROUTINE_PERSIST_KEY);
      return null;
    }
    return slimGuestRoutinePayload(record.payload);
  } catch {
    return null;
  }
}

export function clearPersistedGuestRoutine(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(GUEST_ROUTINE_PERSIST_KEY);
  } catch {
    /* ignore */
  }
}

export function hasPersistedGuestRoutine(): boolean {
  return readPersistedGuestRoutine() != null;
}
