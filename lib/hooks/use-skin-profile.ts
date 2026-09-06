"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchSkinProfile, skinProfileQueryKey } from "@/lib/api/profile";
import { getAccessToken } from "@/lib/auth-token";
import { useAuthStore } from "@/lib/stores/auth-store";

/** Skin profile (type + onboarding snapshot) — gated on auth. */
export function useSkinProfileQuery() {
  const user = useAuthStore((s) => s.user);
  const hasAuth = !!user || !!getAccessToken();

  return useQuery({
    queryKey: skinProfileQueryKey,
    queryFn: fetchSkinProfile,
    enabled: hasAuth,
    retry: 1,
    staleTime: 60_000,
  });
}
