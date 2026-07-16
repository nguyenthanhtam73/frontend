import { clearAccessToken } from "@/lib/auth-token";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { usePrivacyStore } from "@/lib/stores/privacy-store";
import { useSessionStore } from "@/lib/stores/session-store";
import { useSkillStore } from "@/lib/stores/skill-store";
import { COACH_WELCOME_STORAGE_KEY } from "@/lib/types/starter-routine";
import {
  removeBrowserPushSubscription,
  setLocalPushEnabled,
} from "@/lib/web-push";

/** Wipes client-side DaDiary state after a server-side data delete or logout. */
export function clearLocalUserData(): void {
  clearAccessToken();
  useOnboardingStore.getState().reset();
  usePrivacyStore.getState().reset();
  useSessionStore.getState().setUserId(null);
  useSkillStore.getState().setMode(null);
  // Drop local push pref + browser sub (API unsubscribe should run first via
  // clearPushSubscriptionOnLogout when a token is still available).
  setLocalPushEnabled(false);
  void removeBrowserPushSubscription();
  if (typeof window !== "undefined") {
    try {
      sessionStorage.removeItem(COACH_WELCOME_STORAGE_KEY);
      sessionStorage.removeItem("dadiary_onboarding_exit_anim");
      sessionStorage.removeItem("dadiary:last-push-url");
      sessionStorage.removeItem("dadiary:last-push-message-id");
    } catch {
      /* ignore quota / private mode */
    }
  }
}
