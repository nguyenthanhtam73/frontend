import { clearAccessToken } from "@/lib/auth-token";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { usePrivacyStore } from "@/lib/stores/privacy-store";
import { useSessionStore } from "@/lib/stores/session-store";
import { useSkillStore } from "@/lib/stores/skill-store";

import { COACH_WELCOME_STORAGE_KEY } from "@/lib/types/starter-routine";

/** Wipes client-side DaDiary state after a server-side data delete or logout. */
export function clearLocalUserData(): void {
  clearAccessToken();
  useOnboardingStore.getState().reset();
  usePrivacyStore.getState().reset();
  useSessionStore.getState().setUserId(null);
  useSkillStore.getState().setMode(null);
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(COACH_WELCOME_STORAGE_KEY);
      sessionStorage.removeItem("dadiary_onboarding_exit_anim");
    } catch {
      /* ignore quota / private mode */
    }
  }
}
