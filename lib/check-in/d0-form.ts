import {
  hasNeverCheckedIn,
  type FirstCheckInStreakHint,
} from "@/lib/activation/first-check-in";
import { isSkipModeReady } from "@/lib/check-in/check-in-submit";

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

/**
 * D0 sticky "Gửi không ảnh" is a send, not only a mode switch.
 * Keep an existing tag or note; otherwise use the canned D0 skip note so
 * skip-mode submit is ready without asking the user to pick chips.
 */
export function userNoteForD0StickySkipSubmit(input: {
  conditions: readonly string[];
  symptoms: readonly string[];
  userNote: string;
  cannedNote: string;
}): string {
  if (isSkipModeReady(input)) return input.userNote;
  return input.cannedNote;
}

/** Fire form.requestSubmit() only after sticky skip has landed in skip-ready state. */
export function canRequestSubmitAfterD0StickySkip(input: {
  pending: boolean;
  skipMode: boolean;
  skipModeReady: boolean;
}): boolean {
  return input.pending && input.skipMode && input.skipModeReady;
}
