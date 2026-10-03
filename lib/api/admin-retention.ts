import { retentionStatsSearch } from "@/lib/admin/retention-stats";
import { ApiError, apiGet } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-token";
import type { AdminRetentionStats } from "@/lib/types/admin-retention";

export function adminRetentionStatsQueryKey(from: string, to: string) {
  return ["admin", "retention-stats", { from, to }] as const;
}

/** GET /api/v1/admin/retention-stats — optional registration-day window. */
export async function fetchAdminRetentionStats(
  from = "",
  to = "",
): Promise<AdminRetentionStats> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }

  const qs = retentionStatsSearch(from, to);
  const path = qs
    ? `/api/v1/admin/retention-stats?${qs}`
    : "/api/v1/admin/retention-stats";

  try {
    return await apiGet<AdminRetentionStats>(path, { toastOnError: false });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.kind === "unauthorized") throw new Error("auth");
      if (err.kind === "forbidden" || err.status === 403) throw new Error("forbidden");
      // Draft backend: the route 404s until the retention endpoint is deployed.
      if (err.status === 404) throw new Error("not_found");
    }
    throw err;
  }
}
