import { apiGet } from "@/lib/api-client";
import type { UsageQuotaDTO } from "@/lib/types/usage";

export const usageQueryKey = ["me", "usage"] as const;

export async function fetchUsageQuota(): Promise<UsageQuotaDTO> {
  // Background quota poll: silent (React Query owns UI state) but resilient —
  // retry transient network/5xx blips a couple of times before surfacing.
  return apiGet<UsageQuotaDTO>("/api/v1/me/usage", {
    retries: 2,
    toastOnError: false,
  });
}
