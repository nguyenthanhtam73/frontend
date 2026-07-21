"use client";

import { useCallback, useEffect, useState } from "react";

import { useStreak } from "@/lib/hooks/use-streak";
import { Feature } from "@/lib/premium/features";
import { useFeatureGate } from "@/lib/premium/use-feature-gate";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  getCelebratedMilestoneDays,
  markMilestonesCelebratedThrough,
} from "@/lib/streak/milestone-storage";
import {
  findPendingMilestone,
  milestonesForPlan,
  type StreakMilestone,
} from "@/lib/streak/milestones";

/**
 * Watches the streak query and surfaces at most one pending milestone celebration.
 * Persistence is localStorage per user so celebrations are not repeated.
 * Free users only celebrate the basic catalog (3 + 7).
 */
export function useStreakMilestoneCelebration() {
  const userId = useAuthStore((s) => s.user?.id);
  const { data, isSuccess } = useStreak();
  const milestoneGate = useFeatureGate(Feature.MilestoneFull);
  const [active, setActive] = useState<StreakMilestone | null>(null);

  useEffect(() => {
    if (!userId || !isSuccess || !data || milestoneGate.isLoading) {
      setActive(null);
      return;
    }
    const catalog = milestonesForPlan(!milestoneGate.locked && milestoneGate.allowed);
    const celebrated = getCelebratedMilestoneDays(userId);
    const pending = findPendingMilestone(data.current_streak, celebrated, catalog);
    setActive(pending);
  }, [
    userId,
    isSuccess,
    data,
    data?.current_streak,
    milestoneGate.isLoading,
    milestoneGate.locked,
    milestoneGate.allowed,
  ]);

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
