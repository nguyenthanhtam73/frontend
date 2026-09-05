import type { FeatureId, PlanTier } from "@/lib/premium/features";
import type { UsageCounterDTO, UsageQuotaDTO } from "@/lib/types/usage";

export type FeatureAccess = {
  allowed: boolean;
  unlimited?: boolean;
  used?: number;
  limit?: number;
  remaining?: number;
  kind?: "boolean" | "monthly_quota" | "history_months" | string;
  history_months?: number;
};

/** Live meters from GET /me/usage — null when the backend omitted the field. */
export type UsageMeters = {
  routineSuggest: UsageCounterDTO | null;
  routineManualEdit: UsageCounterDTO | null;
  wardrobe: UsageQuotaDTO["wardrobe"] | null;
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
  /** Top-level counters; prefer these when `features` rows omit used/limit. */
  meters: UsageMeters;
  /** Free: create while under shelf slot limit; Premium: always. */
  canWardrobeWrite: boolean;
  /** Signed-in users may edit/delete their own shelf items on every plan. */
  canWardrobeManage: boolean;
  canRoutineSuggest: boolean;
  canRoutineManualEdit: boolean;
};
