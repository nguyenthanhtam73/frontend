/** Local guest AI-wait — no server skin-check id until claim. */

export type GuestAiWaitPhase = "idle" | "submitting" | "processing" | "done";

export const GUEST_AI_WAIT_MS = 6400;
export const GUEST_AI_WAIT_TICK_MS = 400;
export const GUEST_AI_WAIT_STATUS_MS = 2100;
export const GUEST_AI_WAIT_PROGRESS_CAP = 92;
export const GUEST_AI_WAIT_STATUS_COUNT = 3;

/**
 * Photos path only. Skip-mode has no image to "analyze" and must stay
 * local-only (no POST /skin-checks until claim).
 */
export function shouldGuestAiWait(input: {
  hasPhotos: boolean;
  skipMode: boolean;
}): boolean {
  return input.hasPhotos === true && input.skipMode !== true;
}

/** Ease-out progress that caps below 100 until the timer completes. */
export function guestAiWaitProgress(
  elapsedMs: number,
  durationMs = GUEST_AI_WAIT_MS,
): number {
  if (elapsedMs <= 0) return 0;
  if (elapsedMs >= durationMs) return 100;
  const ratio = Math.min(1, elapsedMs / durationMs);
  const eased = 1 - (1 - ratio) * (1 - ratio);
  return Math.min(
    GUEST_AI_WAIT_PROGRESS_CAP,
    Math.round(eased * GUEST_AI_WAIT_PROGRESS_CAP),
  );
}

export function guestAiWaitStatusStep(
  elapsedMs: number,
  intervalMs = GUEST_AI_WAIT_STATUS_MS,
): number {
  if (elapsedMs <= 0) return 0;
  return Math.floor(elapsedMs / intervalMs) % GUEST_AI_WAIT_STATUS_COUNT;
}

export function isGuestAiWaitActive(phase: GuestAiWaitPhase): boolean {
  return phase === "submitting" || phase === "processing";
}
