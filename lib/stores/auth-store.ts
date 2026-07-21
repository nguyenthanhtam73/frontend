import { create } from "zustand";

import { apiBaseUrl } from "@/lib/api";
import type { ApiEnvelope } from "@/lib/api-envelope";
import { authHeaders, clearAccessToken, getAccessToken } from "@/lib/auth-token";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { useSessionStore } from "@/lib/stores/session-store";
import { useSkillStore } from "@/lib/stores/skill-store";
import { setLocalPushEnabled } from "@/lib/web-push";

/** Mirrors backend `dto.UserPublic`. */
export type AuthUser = {
  id: string;
  email: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  provider?: string;
  is_active?: boolean;
  plan_tier?: "free" | "premium" | "premium_plus" | string;
  /** RFC3339 when paid plan ends; omitted for Free / lifetime admin grants. */
  plan_expires_at?: string;
  is_admin?: boolean;
  created_at?: string;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  /** Always clears push (API + browser) before wiping local auth state. */
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  refresh: async () => {
    const token = getAccessToken();
    if (!token) {
      set({ user: null, loading: false });
      return;
    }
    set({ loading: true });
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/me`, { headers: authHeaders() });
      const json = (await res.json().catch(() => ({}))) as ApiEnvelope<AuthUser>;
      if (res.status === 401 || res.status === 403) {
        set({ user: null });
        clearAccessToken();
        return;
      }
      if (!res.ok || !json.data) {
        set({ user: null });
        return;
      }
      set({ user: json.data });
    } catch {
      set({ user: null });
    } finally {
      set({ loading: false });
    }
  },
  logout: async () => {
    // Unsubscribe while JWT is still valid, then drop browser sub + pref.
    try {
      const { clearPushSubscriptionOnLogout } = await import("@/lib/push-logout");
      await clearPushSubscriptionOnLogout();
    } catch {
      setLocalPushEnabled(false);
    }

    clearAccessToken();
    useOnboardingStore.getState().reset();
    useSessionStore.getState().setUserId(null);
    useSkillStore.getState().setMode(null);
    setLocalPushEnabled(false);
    set({ user: null });
  },
}));
