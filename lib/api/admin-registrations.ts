import { REGISTRATION_STATS_TZ } from "@/lib/admin/registrations-by-source";
import { ApiError, apiGet } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-token";
import type { AdminRegistrationsBySource } from "@/lib/types/admin-registrations";

export function adminRegistrationsBySourceQueryKey(
  since: string,
  tz: string = REGISTRATION_STATS_TZ,
) {
  return ["admin", "registrations-by-source", since, tz] as const;
}

/** GET /api/v1/admin/stats/registrations-by-source?since=YYYY-MM-DD&tz=… */
export function registrationsBySourcePath(
  since: string,
  tz: string = REGISTRATION_STATS_TZ,
): string {
  const params = new URLSearchParams({ since, tz });
  return `/api/v1/admin/stats/registrations-by-source?${params.toString()}`;
}

export async function fetchAdminRegistrationsBySource(
  since: string,
  tz: string = REGISTRATION_STATS_TZ,
): Promise<AdminRegistrationsBySource> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }

  try {
    return await apiGet<AdminRegistrationsBySource>(registrationsBySourcePath(since, tz), {
      toastOnError: false,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.kind === "unauthorized") throw new Error("auth");
      if (err.kind === "forbidden" || err.status === 403) throw new Error("forbidden");
      if (err.status === 400) throw new Error("invalid_since");
    }
    throw err;
  }
}
