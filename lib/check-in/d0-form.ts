import {
  hasNeverCheckedIn,
  type FirstCheckInStreakHint,
} from "@/lib/activation/first-check-in";

/**
 * D0 / never_checked_in check-in UX: guests and signed-in users with zero
 * completed server check-ins. After a successful first check-in in this
 * session, compact D0 chrome turns off even if streak has not refetched yet.
 */
export function isNeverCheckedInCheckIn(input: {
  streak: FirstCheckInStreakHint | null | undefined;
  completedThisSession?: boolean;
}): boolean {
  if (input.completedThisSession) return false;
  return hasNeverCheckedIn(input.streak);
}

/** Dual sticky CTAs (take photo + skip) instead of a greyed submit. */
export function shouldShowD0StickyActions(input: {
  neverCheckedIn: boolean;
  skipMode: boolean;
  canSubmit: boolean;
}): boolean {
  return input.neverCheckedIn && !input.skipMode && !input.canSubmit;
}
