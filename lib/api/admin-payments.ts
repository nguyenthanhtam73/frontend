import { ApiError, apiGet } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-token";
import type {
  AdminPaymentMetrics,
  AdminPaymentStatusFilter,
} from "@/lib/types/admin-payment";

export type AdminPaymentMetricsQuery = {
  status?: AdminPaymentStatusFilter;
  limit?: number;
  offset?: number;
};

export function adminPaymentMetricsQueryKey(query: AdminPaymentMetricsQuery) {
  return ["admin", "metrics", "payment", query] as const;
}

export async function fetchAdminPaymentMetrics(
  query: AdminPaymentMetricsQuery = {},
): Promise<AdminPaymentMetrics> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.limit) params.set("limit", String(query.limit));
  if (typeof query.offset === "number") params.set("offset", String(query.offset));
  const qs = params.toString();
  const path = qs
    ? `/api/v1/admin/metrics/payment?${qs}`
    : "/api/v1/admin/metrics/payment";

  try {
    return await apiGet<AdminPaymentMetrics>(path, { toastOnError: false });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.kind === "unauthorized") throw new Error("auth");
      if (err.kind === "forbidden" || err.status === 403) throw new Error("forbidden");
    }
    throw err;
  }
}
