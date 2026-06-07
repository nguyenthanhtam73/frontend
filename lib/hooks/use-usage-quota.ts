"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchUsageQuota, usageQueryKey } from "@/lib/api/usage";
import { getAccessToken } from "@/lib/auth-token";
import { useAuthStore } from "@/lib/stores/auth-store";

/** Monthly free-plan quotas + premium gates (wardrobe write, routine limits). */
export function useUsageQuota() {
  const user = useAuthStore((s) => s.user);
  const hasAuth = !!user || !!getAccessToken();

  const query = useQuery({
    queryKey: usageQueryKey,
    queryFn: fetchUsageQuota,
    enabled: hasAuth,
    staleTime: 60_000,
    retry: 1,
  });

  const data = query.data;
  const isPremium = data?.is_premium ?? user?.plan_tier === "premium";

  return {
    ...query,
    isPremium,
    canWardrobeWrite: isPremium || (data?.wardrobe?.can_write ?? false),
    routineSuggest: data?.routine_suggest,
    routineManualEdit: data?.routine_manual_edit,
    canRoutineSuggest:
      isPremium || (data?.routine_suggest?.remaining ?? 0) > 0 || data?.routine_suggest?.unlimited,
    canRoutineManualEdit:
      isPremium ||
      (data?.routine_manual_edit?.remaining ?? 0) > 0 ||
      data?.routine_manual_edit?.unlimited,
  };
}
