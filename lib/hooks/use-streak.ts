"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchStreak, postUseStreakFreeze, streakQueryKey } from "@/lib/api/streak";
import { getAccessToken } from "@/lib/auth-token";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { StreakDTO } from "@/lib/types/streak";

/** Persisted SkinCheck streak (current / longest / freezes). */
export function useStreak() {
  const user = useAuthStore((s) => s.user);
  const hasAuth = !!user || !!getAccessToken();

  return useQuery({
    queryKey: streakQueryKey,
    queryFn: fetchStreak,
    enabled: hasAuth,
    staleTime: 30_000,
    retry: 1,
  });
}

/** Consume one streak freeze; updates the streak query cache on success. */
export function useUseStreakFreeze() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: postUseStreakFreeze,
    onSuccess: (data: StreakDTO) => {
      queryClient.setQueryData(streakQueryKey, data);
    },
  });
}
