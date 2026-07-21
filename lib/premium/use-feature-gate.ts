"use client";

import type { FeatureId } from "@/lib/premium/features";
import { usePlanTier } from "@/lib/premium/plan-tier-context";
import type { FeatureAccess } from "@/lib/premium/types";

export type FeatureGateResult = {
  /** Current normalized plan. */
  planTier: ReturnType<typeof usePlanTier>["planTier"];
  isPremium: boolean;
  isPremiumPlus: boolean;
  /** Whether /me/usage is still loading. */
  isLoading: boolean;
  /** Whether the user may use this feature right now. */
  allowed: boolean;
  /** Metered feature is uncapped on this plan. */
  unlimited: boolean;
  used: number;
  limit: number;
  remaining: number;
  /** Progress lookback months (0 = all time). */
  historyMonths: number;
  /** Raw access row when present on /me/usage. */
  access: FeatureAccess | undefined;
  /** Convenience: !allowed — show UpsellBanner. */
  locked: boolean;
};

/**
 * Gate a single feature against the user's plan + live quotas.
 *
 * @example
 * const wardrobe = useFeatureGate(Feature.WardrobeFull);
 * if (wardrobe.locked) return <UpsellBanner feature={Feature.WardrobeFull} />;
 */
export function useFeatureGate(feature: FeatureId): FeatureGateResult {
  const snap = usePlanTier();
  const access = snap.features[feature];

  // Prefer server catalog; fall back to legacy counters for the two metered features.
  let allowed = access?.allowed;
  let unlimited = !!access?.unlimited;
  const used = access?.used ?? 0;
  const limit = access?.limit ?? 0;
  const remaining = access?.remaining ?? 0;
  let historyMonths = access?.history_months ?? snap.progressHistoryMonths;

  if (allowed === undefined) {
    switch (feature) {
      case "wardrobe_full":
        allowed = snap.canWardrobeWrite;
        unlimited = snap.isPremium;
        break;
      case "ai_routine_suggestion":
        allowed = snap.canRoutineSuggest;
        unlimited = snap.isPremium;
        break;
      case "edit_routine":
        allowed = snap.canRoutineManualEdit;
        unlimited = snap.isPremium;
        break;
      case "progress_full_history":
        allowed = true;
        unlimited = snap.progressHistoryMonths === 0;
        historyMonths = snap.progressHistoryMonths;
        break;
      case "advanced_skin_analysis":
        allowed = snap.isPremiumPlus;
        unlimited = snap.isPremiumPlus;
        break;
      case "milestone_full":
      case "export_data":
      case "no_ads":
        allowed = snap.isPremium;
        unlimited = snap.isPremium;
        break;
      default:
        allowed = false;
    }
  }

  return {
    planTier: snap.planTier,
    isPremium: snap.isPremium,
    isPremiumPlus: snap.isPremiumPlus,
    isLoading: snap.isLoading,
    allowed: !!allowed,
    unlimited,
    used,
    limit,
    remaining,
    historyMonths,
    access,
    // Don't flash-lock while /me/usage is still loading.
    locked: !snap.isLoading && !allowed,
  };
}
