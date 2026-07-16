"use client";

import { useCallback, useEffect, useState } from "react";

import { useStreak } from "@/lib/hooks/use-streak";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  getCelebratedMilestoneDays,
  markMilestonesCelebratedThrough,
} from "@/lib/streak/milestone-storage";
import {
  findPendingMilestone,
  type StreakMilestone,
} from "@/lib/streak/milestones";

/**
 * Watches the streak query and surfaces at most one pending milestone celebration.
 * Persistence is localStorage per user so celebrations are not repeated.
 */
export function useStreakMilestoneCelebration() {
  const userId = useAuthStore((s) => s.user?.id);
  const { data, isSuccess } = useStreak();
  const [active, setActive] = useState<StreakMilestone | null>(null);

  useEffect(() => {
    if (!userId || !isSuccess || !data) {
      setActive(null);
      return;
    }
    const celebrated = getCelebratedMilestoneDays(userId);
    const pending = findPendingMilestone(data.current_streak, celebrated);
    setActive(pending);
  }, [userId, isSuccess, data, data?.current_streak]);

  const dismiss = useCallback(() => {
    if (!userId || !active) {
      setActive(null);
      return;
    }
    markMilestonesCelebratedThrough(userId, active.days);
    setActive(null);
  }, [userId, active]);

  return {
    milestone: active,
    currentStreak: data?.current_streak ?? 0,
    open: active != null,
    dismiss,
  };
}
