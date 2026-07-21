/**
 * Feature ids — keep in sync with backend `domain.Feature`.
 * Add a constant here, then gate UI via `useFeatureGate(feature)`.
 */
export const Feature = {
  AIRoutineSuggestion: "ai_routine_suggestion",
  EditRoutine: "edit_routine",
  WardrobeFull: "wardrobe_full",
  ProgressFullHistory: "progress_full_history",
  MilestoneFull: "milestone_full",
  ExportData: "export_data",
  AdvancedSkinAnalysis: "advanced_skin_analysis",
  NoAds: "no_ads",
} as const;

export type FeatureId = (typeof Feature)[keyof typeof Feature];

export const ALL_FEATURES: FeatureId[] = Object.values(Feature);

export type PlanTier = "free" | "premium" | "premium_plus";

export function normalizePlanTier(raw?: string | null): PlanTier {
  switch ((raw ?? "").toLowerCase().trim()) {
    case "premium":
      return "premium";
    case "premium_plus":
      return "premium_plus";
    default:
      return "free";
  }
}

export function isPaidPlan(tier: PlanTier): boolean {
  return tier === "premium" || tier === "premium_plus";
}
