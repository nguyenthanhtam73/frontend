import { ApiError, apiGet, apiPut } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-token";
import type {
  AdminPlanTier,
  AdminUpdatePlanResponse,
  AdminUserDetailResponse,
  AdminUserListResponse,
} from "@/lib/types/admin-user";

export type AdminUsersQuery = {
  q?: string;
  page?: number;
  page_size?: number;
};

export function adminUsersQueryKey(query: AdminUsersQuery) {
  return ["admin", "users", query] as const;
}

export function adminUserDetailQueryKey(id: string) {
  return ["admin", "users", id] as const;
}

export async function fetchAdminUsers(
  query: AdminUsersQuery = {},
): Promise<AdminUserListResponse> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.page) params.set("page", String(query.page));
  if (query.page_size) params.set("page_size", String(query.page_size));
  const qs = params.toString();
  const path = qs ? `/api/v1/admin/users?${qs}` : "/api/v1/admin/users";

  try {
    return await apiGet<AdminUserListResponse>(path, { toastOnError: false });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.kind === "unauthorized") throw new Error("auth");
      if (err.kind === "forbidden" || err.status === 403) throw new Error("forbidden");
    }
    throw err;
  }
}

export async function fetchAdminUserDetail(
  id: string,
): Promise<AdminUserDetailResponse> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }
  try {
    return await apiGet<AdminUserDetailResponse>(`/api/v1/admin/users/${id}`, {
      toastOnError: false,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.kind === "unauthorized") throw new Error("auth");
      if (err.kind === "forbidden" || err.status === 403) throw new Error("forbidden");
      if (err.status === 404) throw new Error("not_found");
    }
    throw err;
  }
}

export async function updateAdminUserPlan(
  id: string,
  planTier: AdminPlanTier,
  reason?: string,
): Promise<AdminUpdatePlanResponse> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }
  try {
    return await apiPut<AdminUpdatePlanResponse>(
      `/api/v1/admin/users/${id}/plan`,
      { plan_tier: planTier, reason: reason?.trim() || undefined },
      { toastOnError: false },
    );
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.kind === "unauthorized") throw new Error("auth");
      if (err.kind === "forbidden" || err.status === 403) throw new Error("forbidden");
      if (err.status === 404) throw new Error("not_found");
      if (err.status === 409) throw new Error("plan_unchanged");
      if (err.status === 400) throw new Error("invalid_input");
    }
    throw err;
  }
}
