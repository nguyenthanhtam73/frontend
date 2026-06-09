import {
  COACH_WELCOME_STORAGE_KEY,
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

export function isCoachWelcomeRoutinePending(): boolean {
  return readCoachWelcomeSession()?.starterRoutinePending === true;
}
