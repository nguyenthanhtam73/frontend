"use client";

import { hasNeverCheckedIn } from "@/lib/activation/first-check-in";
import { getAccessToken } from "@/lib/auth-token";
import {
  resolveCabinetEmptyIntent,
  type CabinetEmptyIntent,
} from "@/lib/cabinet/empty-intent";
import { useStreak } from "@/lib/hooks/use-streak";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";

/** Shared Cabinet empty-state intent (list, form, starter pack). */
export function useCabinetEmptyIntent(): CabinetEmptyIntent {
  const user = useAuthStore((s) => s.user);
  const hasAuth = !!user || !!getAccessToken();
  const onboardingComplete = !!useOnboardingStore((s) => s.completedAt);
  const streak = useStreak();
  const streakSettled = !streak.isPending || !!streak.data || streak.isError;

  return resolveCabinetEmptyIntent({
    hasAuth,
    streakSettled: hasAuth && streakSettled,
    neverCheckedIn: hasNeverCheckedIn(streak.data),
    onboardingComplete,
  });
}
