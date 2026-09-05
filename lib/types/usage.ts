import type { FeatureId, PlanTier } from "@/lib/premium/features";
import type { FeatureAccess } from "@/lib/premium/types";

/**
 * GET /api/v1/me/usage contract the activation/paywall UI depends on.
 *
 * Required for live used/remaining chips (frontend will not invent 3/5/3):
 * - routine_suggest / routine_manual_edit: { used, limit, remaining, unlimited? }
 * - wardrobe: { used, limit, remaining, unlimited?, can_write, can_manage? }
 * Optional richer catalog: features.ai_routine_suggestion | edit_routine |
 * wardrobe_full with the same meter fields + allowed.
 *
 * Streak 0 reminder uses GET /api/v1/me/streak
 * (current_streak, first_check_in_date, last_check_in_date).
 */

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
  wardrobe: {
    can_write: boolean;
    can_manage?: boolean;
    used?: number;
    limit?: number;
    remaining?: number;
    unlimited?: boolean;
  };
  routine_suggest: UsageCounterDTO;
  routine_manual_edit: UsageCounterDTO;
  progress_history_months?: number;
  features?: Partial<Record<FeatureId, FeatureAccess>>;
};
