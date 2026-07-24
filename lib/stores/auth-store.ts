import { create } from "zustand";

import { apiBaseUrl } from "@/lib/api";
import type { ApiEnvelope } from "@/lib/api-envelope";
import {
  authHeaders,
  clearAccessToken,
  ensureFreshAccessToken,
  getAccessToken,
  getRefreshToken,
} from "@/lib/auth-token";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { useSessionStore } from "@/lib/stores/session-store";
import { useSkillStore } from "@/lib/stores/skill-store";
import { setLocalPushEnabled } from "@/lib/web-push";

/** Mirrors backend `dto.UserPublic` (+ subscription lifecycle from GET /me). */
export type AuthUser = {
  id: string;
  email: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  provider?: string;
  is_active?: boolean;
  plan_tier?: "free" | "premium" | "premium_plus" | string;
  /** RFC3339 when paid/trial period ends (before grace). */
  plan_expires_at?: string;
  subscription_status?:
    | "none"
    | "trialing"
    | "active"
    | "canceled"
    | "past_due"
    | "expired"
    | string;
  trial_ends_at?: string;
  canceled_at?: string;
  grace_ends_at?: string;
  /** Days until access ends (incl. grace). -1 = lifetime. */
  days_left?: number;
  in_grace?: boolean;
  cancel_at_period_end?: boolean;
  eligible_for_trial?: boolean;
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

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: false,
  refresh: async () => {
    const hasSession = !!getAccessToken() || !!getRefreshToken();
    if (!hasSession) {
      set({ user: null, loading: false });
      return;
    }
    set({ loading: true });
    try {
      // Renew access when expired so /me is not a false 401.
      await ensureFreshAccessToken(apiBaseUrl);
      if (!getAccessToken()) {
        // Refresh failed permanently (invalid/revoked) — already cleared tokens.
        set({ user: null });
        return;
      }

      const res = await fetch(`${apiBaseUrl}/api/v1/me`, { headers: authHeaders() });
      const json = (await res.json().catch(() => ({}))) as ApiEnvelope<AuthUser>;

      if (res.status === 401 || res.status === 403) {
        // True auth failure — drop session.
        clearAccessToken();
        set({ user: null });
        return;
      }
      if (!res.ok) {
        // Network-adjacent / 5xx: keep prior user to avoid flash logout.
        return;
      }
      if (!json.data) {
        return;
      }
      set({ user: json.data });
    } catch {
      // Offline / fetch throw — keep prior user.
      void get().user;
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

    // Best-effort server revoke (refresh sessions) before wiping local tokens.
    try {
      const refresh = getRefreshToken();
      const access = getAccessToken();
      if (access) {
        await fetch(`${apiBaseUrl}/api/v1/auth/logout`, {
          method: "POST",
          headers: {
            ...authHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(refresh ? { refresh_token: refresh } : {}),
        });
      }
    } catch {
      /* ignore — local clear still proceeds */
    }

    clearAccessToken();
    useOnboardingStore.getState().reset();
    useSessionStore.getState().setUserId(null);
    useSkillStore.getState().setMode(null);
    setLocalPushEnabled(false);
    set({ user: null });
  },
}));
