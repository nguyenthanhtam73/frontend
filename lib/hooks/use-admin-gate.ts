"use client";

import { useEffect, useState } from "react";

import { getAccessToken } from "@/lib/auth-token";
import { useAuthStore } from "@/lib/stores/auth-store";

export type AdminGateState = {
  /** Token present or user already loaded. */
  hasAuth: boolean;
  /** True only after /me has resolved for the current session. */
  isAdmin: boolean;
  /**
   * True while we still don't know admin status (token exists but user
   * not hydrated yet). Callers should show a skeleton — never "forbidden".
   */
  authPending: boolean;
};

/**
 * Admin page gate: wait for auth hydrate before deciding forbidden.
 * Mirrors SiteHeader's refresh-on-mount so is_admin is available.
 */
export function useAdminGate(): AdminGateState {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let alive = true;
    void useAuthStore
      .getState()
      .refresh()
      .finally(() => {
        if (alive) setHydrated(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  const hasToken = typeof window !== "undefined" ? !!getAccessToken() : false;
  const hasAuth = !!user || hasToken;

  // Wait until the first refresh finishes. Also cover in-flight /me with a token.
  const authPending = !hydrated || (hasToken && !user && loading);

  return {
    hasAuth,
    isAdmin: !!user?.is_admin,
    authPending,
  };
}
