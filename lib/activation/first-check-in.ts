/**
 * Activation helpers: get a newly signed-in user to /check-in in the same session.
 * Session-only — never persist across tabs/devices, and never block the guest funnel.
 */

const AWAITING_KEY = "dadiary_awaiting_first_checkin_v1";
const PROMPT_DISMISS_KEY = "dadiary_first_checkin_prompt_dismissed_v1";
const BANNER_DISMISS_KEY = "dadiary_activation_banner_dismissed_v1";

export type FirstCheckInStreakHint = {
  current_streak?: number | null;
  first_check_in_date?: string | null;
  last_check_in_date?: string | null;
};

/** True when the user has never completed a skin check-in. */
export function hasNeverCheckedIn(streak: FirstCheckInStreakHint | null | undefined): boolean {
  if (!streak) return true;
  if ((streak.current_streak ?? 0) > 0) return false;
  if (streak.first_check_in_date?.trim()) return false;
  if (streak.last_check_in_date?.trim()) return false;
  return true;
}

function readFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    /* private mode / quota */
  }
}

/** Call after guest claim or signed-in onboarding finish — same session only. */
export function markAwaitingFirstCheckIn(): void {
  writeFlag(AWAITING_KEY);
}

export function isAwaitingFirstCheckIn(): boolean {
  return readFlag(AWAITING_KEY);
}

export function dismissFirstCheckInPrompt(): void {
  writeFlag(PROMPT_DISMISS_KEY);
}

export function isFirstCheckInPromptDismissed(): boolean {
  return readFlag(PROMPT_DISMISS_KEY);
}

export function dismissActivationBanner(): void {
  writeFlag(BANNER_DISMISS_KEY);
}

export function isActivationBannerDismissed(): boolean {
  return readFlag(BANNER_DISMISS_KEY);
}

export function shouldShowFirstCheckInPrompt(input: {
  signedIn: boolean;
  isGuest: boolean;
  pendingAccountClaim: boolean;
  dismissed: boolean;
  awaiting: boolean;
  streakStatus: "loading" | "ready" | "error";
  neverCheckedIn: boolean;
}): boolean {
  if (!input.signedIn || input.isGuest || input.pendingAccountClaim) return false;
  if (input.dismissed) return false;
  if (input.awaiting) return true;
  if (input.streakStatus === "loading") return false;
  if (input.streakStatus === "error") return true;
  return input.neverCheckedIn;
}

export function shouldShowActivationBanner(input: {
  signedIn: boolean;
  dismissed: boolean;
  onFunnelPath: boolean;
  onCheckInPath: boolean;
  onCoachWelcomePath: boolean;
  streakStatus: "loading" | "ready" | "error";
  neverCheckedIn: boolean;
}): boolean {
  if (!input.signedIn || input.dismissed) return false;
  if (input.onFunnelPath || input.onCheckInPath || input.onCoachWelcomePath) {
    return false;
  }
  if (input.streakStatus !== "ready") return false;
  return input.neverCheckedIn;
}

export function shouldShowCheckInFirstVisit(input: {
  signedIn: boolean;
  onCheckInPath: boolean;
  streakStatus: "loading" | "ready" | "error";
  neverCheckedIn: boolean;
}): boolean {
  if (!input.signedIn || !input.onCheckInPath) return false;
  if (input.streakStatus === "loading") return false;
  return input.neverCheckedIn || input.streakStatus === "error";
}
