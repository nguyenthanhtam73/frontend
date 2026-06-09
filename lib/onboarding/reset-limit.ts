import { ONBOARDING_RESET_KEY } from "@/lib/onboarding/constants";

/** Whether the user may reset onboarding today (one reset per calendar day). */
export function canResetOnboardingToday(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const last = localStorage.getItem(ONBOARDING_RESET_KEY);
    if (!last) return true;
    const lastDate = new Date(last);
    const now = new Date();
    if (Number.isNaN(lastDate.getTime())) return true;
    return lastDate.toDateString() !== now.toDateString();
  } catch {
    return true;
  }
}

export function markOnboardingResetPerformed(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ONBOARDING_RESET_KEY, new Date().toISOString());
  } catch {
    /* private mode / quota */
  }
}
