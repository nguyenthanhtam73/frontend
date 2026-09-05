"use client";

import { useQuery } from "@tanstack/react-query";

import {
  checkInReminderQueryKey,
  fetchCheckInReminder,
} from "@/lib/api/check-in-reminder";
import { getAccessToken } from "@/lib/auth-token";
import { useAuthStore } from "@/lib/stores/auth-store";

/** Live D0/D1 check-in reminder from GET /api/v1/me/check-in-reminder. */
export function useCheckInReminder() {
  const user = useAuthStore((s) => s.user);
  const hasAuth = !!user || !!getAccessToken();

  return useQuery({
    queryKey: checkInReminderQueryKey,
    queryFn: fetchCheckInReminder,
    enabled: hasAuth,
    staleTime: 30_000,
    retry: 1,
  });
}
