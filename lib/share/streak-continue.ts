/** Pure helpers for the post-check-in streak-continue celebration. */

import { safeShareFilename } from "@/lib/share/before-after";

/** Celebrate when a successful check-in continues/extends a real streak. */
export const MIN_STREAK_CONTINUE_DAYS = 2;

export const STREAK_CARD_SIZE = 1080;

export function shouldCelebrateStreakContinue(input: {
  currentStreak: number | null | undefined;
  submittedThisSession: boolean;
  hasPendingMilestone: boolean;
}): boolean {
  if (!input.submittedThisSession) return false;
  if (input.hasPendingMilestone) return false;
  const n = input.currentStreak;
  return typeof n === "number" && Number.isFinite(n) && n >= MIN_STREAK_CONTINUE_DAYS;
}

export function streakShareFilename(days: number): string {
  const n = Number.isFinite(days) ? Math.max(0, Math.floor(days)) : 0;
  return safeShareFilename(`dadiary-streak-${n}`);
}

export function streakCardLayout(size = STREAK_CARD_SIZE) {
  const pad = Math.round(size * 0.078);
  const inner = size - pad * 2;
  return {
    width: size,
    height: size,
    pad,
    radius: Math.round(size * 0.04),
    brand: { x: pad, y: pad, w: inner, h: Math.round(size * 0.12) },
    number: { x: pad, y: Math.round(size * 0.3), w: inner, h: Math.round(size * 0.28) },
    sub: { x: pad, y: Math.round(size * 0.58), w: inner, h: Math.round(size * 0.14) },
    footer: { x: pad, y: size - pad - Math.round(size * 0.16), w: inner, h: Math.round(size * 0.16) },
  };
}
