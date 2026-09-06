import { apiPost } from "@/lib/api-client";

export type PersistPaywallViewInput = {
  surface: string;
  feature?: string;
  recommendedPlan?: string;
};

/** POST /api/v1/analytics/paywall-view — fire-and-forget impression ingest. */
export async function persistPaywallView(
  input: PersistPaywallViewInput,
): Promise<void> {
  try {
    await apiPost(
      "/api/v1/analytics/paywall-view",
      {
        surface: input.surface,
        feature: input.feature,
        recommended_plan: input.recommendedPlan,
      },
      { toastOnError: false, clearTokenOn401: false, timeoutMs: 5000 },
    );
  } catch {
    /* swallow — best-effort, same as affiliate/clicks */
  }
}
