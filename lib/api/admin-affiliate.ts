import { ApiError, apiGet } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-token";
import type { AdminAffiliateMetrics } from "@/lib/types/admin-affiliate";

export function adminAffiliateMetricsQueryKey(limit = 50) {
  return ["admin", "metrics", "affiliate", { limit }] as const;
}

/** GET /api/v1/admin/metrics/affiliate */
export async function fetchAdminAffiliateMetrics(limit = 50): Promise<AdminAffiliateMetrics> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }
  const qs = limit !== 50 ? `?limit=${limit}` : "";
  try {
    return await apiGet<AdminAffiliateMetrics>(`/api/v1/admin/metrics/affiliate${qs}`, {
      toastOnError: false,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.kind === "unauthorized") throw new Error("auth");
      if (err.kind === "forbidden" || err.status === 403) throw new Error("forbidden");
    }
    throw err;
  }
}
