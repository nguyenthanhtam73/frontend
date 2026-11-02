"use client";

import { useEffect, useState } from "react";

import { getAccessToken } from "@/lib/auth-token";
import { mascotFeatureEnabled } from "@/lib/mascot/feature";
import { useAuthStore } from "@/lib/stores/auth-store";

/**
 * Gate from GET /me `features.mascot`. Missing or false stays off.
 * Waits for the same /me refresh the rest of the shell uses before deciding.
 */
export function useMascotFeature(): { enabled: boolean; pending: boolean } {
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
  const pending = !hydrated || (hasToken && !user && loading);

  return { enabled: mascotFeatureEnabled(user), pending };
}
