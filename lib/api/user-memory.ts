import { apiBaseUrl } from "@/lib/api";
import { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-envelope";
import { authHeaders, getAccessToken } from "@/lib/auth-token";
import type { UserMemoryDTO } from "@/lib/types/user-memory";

export async function fetchUserMemory(fresh = false): Promise<UserMemoryDTO> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }
  const q = fresh ? "?fresh=1" : "";
  const res = await fetch(`${apiBaseUrl}/api/v1/me/memory${q}`, {
    headers: authHeaders(),
  });
  const json = (await res.json().catch(() => ({}))) as ApiEnvelope<UserMemoryDTO>;
  if (res.status === 401 || res.status === 403) {
    throw new Error("auth");
  }
  if (!res.ok || !json.data) {
    throw new Error(getApiErrorMessage(json, "memory_fetch_failed"));
  }
  return json.data;
}

export const userMemoryQueryKey = (fresh: boolean) => ["me", "memory", fresh] as const;
