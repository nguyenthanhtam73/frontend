import { clearAccessToken } from "@/lib/auth-token";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { usePrivacyStore } from "@/lib/stores/privacy-store";
import { useSessionStore } from "@/lib/stores/session-store";
import { useSkillStore } from "@/lib/stores/skill-store";

/** Wipes client-side DaDiary state after a server-side data delete or logout. */
export function clearLocalUserData(): void {
  clearAccessToken();
  useOnboardingStore.getState().reset();
  usePrivacyStore.getState().reset();
  useSessionStore.getState().setUserId(null);
  useSkillStore.getState().setMode(null);
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem("dadiary:coach-welcome");
    } catch {
      /* ignore quota / private mode */
    }
  }
}
