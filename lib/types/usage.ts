import type { FeatureId, PlanTier } from "@/lib/premium/features";
import type { FeatureAccess } from "@/lib/premium/types";

export type UsageCounterDTO = {
  used: number;
  limit: number;
  remaining: number;
  unlimited?: boolean;
};

export type UsageQuotaDTO = {
  plan_tier: PlanTier | string;
  is_premium: boolean;
  is_premium_plus?: boolean;
  period: string;
  wardrobe: { can_write: boolean };
  routine_suggest: UsageCounterDTO;
  routine_manual_edit: UsageCounterDTO;
  progress_history_months?: number;
  features?: Partial<Record<FeatureId, FeatureAccess>>;
};
