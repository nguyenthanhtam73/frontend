import { ApiError, apiGet } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-token";
import type { AdminFunnelStats } from "@/lib/types/admin-funnel";

export function adminFunnelStatsQueryKey() {
  return ["admin", "funnel-stats"] as const;
}

/** GET /api/v1/admin/funnel-stats */
export async function fetchAdminFunnelStats(): Promise<AdminFunnelStats> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }

  try {
    return await apiGet<AdminFunnelStats>("/api/v1/admin/funnel-stats", {
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
