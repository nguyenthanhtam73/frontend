import { ApiError, apiGet } from "@/lib/api-client";
import { getAccessToken } from "@/lib/auth-token";
import type { UserMemoryDTO } from "@/lib/types/user-memory";

export async function fetchUserMemory(fresh = false): Promise<UserMemoryDTO> {
  if (!getAccessToken()) {
    throw new Error("auth");
  }
  const q = fresh ? "?fresh=1" : "";
  try {
    // Toast is off here: the memory view renders its own auth/retry UI, and the
    // manual "refresh" action shows its own toast on failure.
    return await apiGet<UserMemoryDTO>(`/api/v1/me/memory${q}`, {
      toastOnError: false,
    });
  } catch (err) {
    // Preserve the "auth" sentinel the view switches on for its sign-in prompt.
    if (err instanceof ApiError && (err.kind === "unauthorized" || err.kind === "forbidden")) {
      throw new Error("auth");
    }
    throw err;
  }
}

export const userMemoryQueryKey = (fresh: boolean) => ["me", "memory", fresh] as const;
