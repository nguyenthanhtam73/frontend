"use client";

import { usePlanTier } from "@/lib/premium/plan-tier-context";
import { normalizePlanTier } from "@/lib/premium/features";
import { useQuery } from "@tanstack/react-query";

import { fetchUsageQuota, usageQueryKey } from "@/lib/api/usage";
import { getAccessToken } from "@/lib/auth-token";
import { useAuthStore } from "@/lib/stores/auth-store";

/**
 * Monthly quotas + premium gates.
 * Prefer `useFeatureGate(Feature.*)` for new UI; this hook stays for existing callers.
 */
export function useUsageQuota() {
  const user = useAuthStore((s) => s.user);
  const hasAuth = !!user || !!getAccessToken();
  const plan = usePlanTier();

  const query = useQuery({
    queryKey: usageQueryKey,
    queryFn: fetchUsageQuota,
    enabled: hasAuth,
    staleTime: 60_000,
    retry: 1,
  });

  const data = query.data;
  const isPremium = data?.is_premium ?? plan.isPremium;

  return {
    ...query,
    isPremium,
    isPremiumPlus: data?.is_premium_plus ?? plan.isPremiumPlus,
    planTier: normalizePlanTier(data?.plan_tier ?? plan.planTier),
    canWardrobeWrite: plan.canWardrobeWrite,
    routineSuggest: data?.routine_suggest,
    routineManualEdit: data?.routine_manual_edit,
    canRoutineSuggest: plan.canRoutineSuggest,
    canRoutineManualEdit: plan.canRoutineManualEdit,
    progressHistoryMonths: data?.progress_history_months ?? plan.progressHistoryMonths,
    features: data?.features ?? plan.features,
  };
}
