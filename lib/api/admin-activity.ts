import { ApiError, apiGet } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-token";
import type { AdminActivityResponse } from "@/lib/types/admin-activity";

export function adminActivityQueryKey(date?: string) {
  return ["admin", "activity", date ?? "today"] as const;
}

export async function fetchAdminActivity(
  date?: string,
): Promise<AdminActivityResponse> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }
  const params = new URLSearchParams();
  if (date) params.set("date", date);
  const qs = params.toString();
  const path = qs ? `/api/v1/admin/activity?${qs}` : "/api/v1/admin/activity";

  try {
    return await apiGet<AdminActivityResponse>(path, { toastOnError: false });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.kind === "unauthorized") throw new Error("auth");
      if (err.kind === "forbidden" || err.status === 403) throw new Error("forbidden");
      if (err.status === 400) throw new Error("invalid_date");
    }
    throw err;
  }
}
