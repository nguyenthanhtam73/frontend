"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";

import { fetchUsageQuota, usageQueryKey } from "@/lib/api/usage";
import { getAccessToken } from "@/lib/auth-token";
import {
  isPaidPlan,
  normalizePlanTier,
  type FeatureId,
  type PlanTier,
} from "@/lib/premium/features";
import type { FeatureAccess, FeatureGateSnapshot } from "@/lib/premium/types";
import { useAuthStore } from "@/lib/stores/auth-store";

const PlanTierContext = createContext<FeatureGateSnapshot | null>(null);

/**
 * Build gate flags from /me/usage.
 *
 * While usage is still loading, Free metered features stay **optimistic open**
 * (assume full monthly quota) so the routine editor doesn't flash-lock.
 * After fetch, server `features` / counters are authoritative.
 */
function buildSnapshot(
  planTier: PlanTier,
  data: Awaited<ReturnType<typeof fetchUsageQuota>> | undefined,
  meta: { isLoading: boolean; isFetched: boolean },
): FeatureGateSnapshot {
  const isPremium = data?.is_premium ?? isPaidPlan(planTier);
  const isPremiumPlus =
    data?.is_premium_plus ?? planTier === "premium_plus";
  const features = (data?.features ?? {}) as Partial<Record<FeatureId, FeatureAccess>>;

  const suggest = data?.routine_suggest;
  const edit = data?.routine_manual_edit;
  const hasUsagePayload = !!data;

  // Optimistic Free defaults before /me/usage lands (avoid locking the UI).
  const optimisticFreeSuggest = !isPremium && !hasUsagePayload;
  const optimisticFreeEdit = !isPremium && !hasUsagePayload;

  return {
    planTier,
    isPremium,
    isPremiumPlus,
    period: data?.period ?? null,
    progressHistoryMonths:
      data?.progress_history_months ??
      (planTier === "free" ? 3 : planTier === "premium" ? 12 : 0),
    isLoading: meta.isLoading,
    isFetched: meta.isFetched,
    features,
    canWardrobeWrite:
      features.wardrobe_full?.allowed ??
      data?.wardrobe?.can_write ??
      isPremium,
    canRoutineSuggest:
      features.ai_routine_suggestion?.allowed ??
      (isPremium ||
        !!suggest?.unlimited ||
        (suggest != null ? suggest.remaining > 0 : optimisticFreeSuggest)),
    canRoutineManualEdit:
      features.edit_routine?.allowed ??
      (isPremium ||
        !!edit?.unlimited ||
        (edit != null ? edit.remaining > 0 : optimisticFreeEdit)),
  };
}

/**
 * Provides plan tier + feature catalog from GET /me/usage.
 * Mount once under AppProviders (inside QueryClientProvider).
 */
export function PlanTierProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const hasAuth = !!user || !!getAccessToken();
  const authTier = normalizePlanTier(user?.plan_tier);

  const query = useQuery({
    queryKey: usageQueryKey,
    queryFn: fetchUsageQuota,
    enabled: hasAuth,
    staleTime: 60_000,
    retry: 1,
  });

  const value = useMemo(
    () =>
      buildSnapshot(
        normalizePlanTier(query.data?.plan_tier ?? authTier),
        query.data,
        {
          isLoading: hasAuth && query.isLoading,
          isFetched: !hasAuth || query.isFetched,
        },
      ),
    [authTier, hasAuth, query.data, query.isFetched, query.isLoading],
  );

  return (
    <PlanTierContext.Provider value={value}>{children}</PlanTierContext.Provider>
  );
}

/** Read the current plan snapshot (safe defaults when provider is missing). */
export function usePlanTier(): FeatureGateSnapshot {
  const ctx = useContext(PlanTierContext);
  if (ctx) return ctx;
  return buildSnapshot("free", undefined, { isLoading: false, isFetched: false });
}

export function usePlanTierOptional(): FeatureGateSnapshot | null {
  return useContext(PlanTierContext);
}
