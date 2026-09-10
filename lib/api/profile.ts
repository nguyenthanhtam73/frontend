import { ApiError, apiDelete, apiGet } from "@/lib/api-client";
import type { SkinProfileResponse } from "@/lib/types/profile";

export const skinProfileQueryKey = ["profile", "skin"] as const;

export type DeleteOnboardingDTO = {
  deleted_at: string;
};

function throwProfileError(err: unknown, fallback: string): never {
  if (err instanceof ApiError) {
    if (err.kind === "unauthorized" || err.status === 401 || err.status === 403) {
      throw new Error("auth");
    }
    throw new Error(err.serverMessage || fallback);
  }
  throw err instanceof Error ? err : new Error(fallback);
}

export async function fetchSkinProfile(): Promise<SkinProfileResponse | null> {
  try {
    return await apiGet<SkinProfileResponse>("/api/v1/profile/skin", {
      toastOnError: false,
    });
  } catch (err) {
    throwProfileError(err, "fetch_failed");
  }
}

export async function deleteOnboarding(): Promise<DeleteOnboardingDTO> {
  try {
    return await apiDelete<DeleteOnboardingDTO>("/api/v1/profile/onboarding", {
      toastOnError: false,
    });
  } catch (err) {
    throwProfileError(err, "delete_failed");
  }
}
