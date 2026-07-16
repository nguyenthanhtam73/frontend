import { apiGet, apiPost } from "@/lib/api-client";
import type { StreakDTO } from "@/lib/types/streak";

export const streakQueryKey = ["me", "streak"] as const;

export async function fetchStreak(): Promise<StreakDTO> {
  return apiGet<StreakDTO>("/api/v1/me/streak", {
    retries: 2,
    toastOnError: false,
  });
}

/** Consume one freeze to protect a calendar day (Vietnam calendar). */
export async function postUseStreakFreeze(): Promise<StreakDTO> {
  return apiPost<StreakDTO>("/api/v1/me/streak/freeze", undefined, {
    toastOnError: false,
  });
}
