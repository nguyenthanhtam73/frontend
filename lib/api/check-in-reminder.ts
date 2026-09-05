import { apiGet } from "@/lib/api-client";
import type { CheckInReminderDTO } from "@/lib/types/check-in-reminder";

export const checkInReminderQueryKey = ["me", "check-in-reminder"] as const;

/** Live D0/D1 reminder for the signed-in user (auth via Bearer / refresh). */
export async function fetchCheckInReminder(): Promise<CheckInReminderDTO> {
  return apiGet<CheckInReminderDTO>("/api/v1/me/check-in-reminder", {
    retries: 2,
    toastOnError: false,
  });
}
