import { apiBaseUrl } from "@/lib/api";
import type { ApiEnvelope } from "@/lib/api-envelope";
import { authHeaders } from "@/lib/auth-token";
import type { UsageQuotaDTO } from "@/lib/types/usage";

export const usageQueryKey = ["me", "usage"] as const;

export async function fetchUsageQuota(): Promise<UsageQuotaDTO> {
  const res = await fetch(`${apiBaseUrl}/api/v1/me/usage`, { headers: authHeaders() });
  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<UsageQuotaDTO>;
  if (!res.ok || !json.data) {
    throw new Error(json.error?.message ?? `usage HTTP ${res.status}`);
  }
  return json.data;
}
