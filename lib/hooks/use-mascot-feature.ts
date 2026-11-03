"use client";

import { getAccessToken } from "@/lib/auth-token";
import { mascotFeatureEnabled } from "@/lib/mascot/feature";
import { useAuthStore } from "@/lib/stores/auth-store";

/**
 * Gate from the user already loaded by the shell's GET /me.
 * Does not call /me again. Missing `features.mascot` stays off.
 */
export function useMascotFeature(): { enabled: boolean; pending: boolean } {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const hasToken = typeof window !== "undefined" ? !!getAccessToken() : false;
  const pending = !user && (loading || hasToken);
  return { enabled: mascotFeatureEnabled(user), pending };
}
