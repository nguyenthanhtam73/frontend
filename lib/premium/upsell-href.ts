import {
  Feature,
  type FeatureId,
} from "@/lib/premium/features";
import type { PricedPlan } from "@/lib/premium/pricing";

/** Query key so pricing can explain why the user landed there. */
export const UPSELL_FROM_PARAM = "from";

const FEATURE_PLAN: Record<FeatureId, PricedPlan> = {
  [Feature.AIRoutineSuggestion]: "premium",
  [Feature.EditRoutine]: "premium",
  [Feature.WardrobeFull]: "premium",
  [Feature.ProgressFullHistory]: "premium",
  [Feature.MilestoneFull]: "premium",
  [Feature.ExportData]: "premium",
  [Feature.NoAds]: "premium",
  [Feature.AdvancedSkinAnalysis]: "premium_plus",
};

const KNOWN_FEATURES = new Set<string>(Object.values(Feature));

/** Pricing URL with plan + feature context. Does not auto-start checkout. */
export function buildUpsellPricingHref(feature?: FeatureId): string {
  const plan = feature ? FEATURE_PLAN[feature] : "premium";
  const params = new URLSearchParams({
    plan,
    interval: "yearly",
  });
  if (feature) params.set(UPSELL_FROM_PARAM, feature);
  return `/pricing?${params.toString()}`;
}

export function recommendedPlanForFeature(feature?: FeatureId): PricedPlan {
  return feature ? FEATURE_PLAN[feature] : "premium";
}

export function readUpsellFeatureFromSearch(
  search: string | URLSearchParams,
): FeatureId | null {
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search;
  const raw = (params.get(UPSELL_FROM_PARAM) ?? "").trim();
  if (!KNOWN_FEATURES.has(raw)) return null;
  return raw as FeatureId;
}

/** True when GET /me/usage (or features catalog) sent a real monthly meter. */
export function hasLiveUsageMeter(input: {
  used?: number | null;
  limit?: number | null;
  remaining?: number | null;
  unlimited?: boolean;
}): boolean {
  if (input.unlimited) return false;
  if (typeof input.limit === "number" && input.limit > 0) return true;
  if (typeof input.used === "number" && input.used > 0) return true;
  if (typeof input.remaining === "number" && input.remaining > 0) return true;
  return false;
}
