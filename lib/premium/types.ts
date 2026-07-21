import type { FeatureId, PlanTier } from "@/lib/premium/features";

export type FeatureAccess = {
  allowed: boolean;
  unlimited?: boolean;
  used?: number;
  limit?: number;
  remaining?: number;
  kind?: "boolean" | "monthly_quota" | "history_months" | string;
  history_months?: number;
};

export type FeatureGateSnapshot = {
  planTier: PlanTier;
  isPremium: boolean;
  isPremiumPlus: boolean;
  period: string | null;
  progressHistoryMonths: number;
  /** True until the first /me/usage response (or when logged out). */
  isLoading: boolean;
  /** True after at least one successful or failed fetch attempt. */
  isFetched: boolean;
  /** Raw catalog from GET /me/usage — keyed by FeatureId. */
  features: Partial<Record<FeatureId, FeatureAccess>>;
  canWardrobeWrite: boolean;
  canRoutineSuggest: boolean;
  canRoutineManualEdit: boolean;
};
