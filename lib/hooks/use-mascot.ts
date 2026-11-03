"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";

import { fetchMascot, mascotQueryKey } from "@/lib/api/mascot";
import { getAccessToken } from "@/lib/auth-token";
import {
  defaultSnapshot,
  resolveBeDaView,
  resolveMissedDays,
  type BeDaView,
} from "@/lib/mascot/model";
import { mascotQueryHidesUI } from "@/lib/mascot/feature";
import { useBeDaPoseStore } from "@/lib/mascot/pose-store";
import { useStreak } from "@/lib/hooks/use-streak";
import { useAuthStore } from "@/lib/stores/auth-store";
import { streakDateKey } from "@/lib/streak/history";

export function useBeDaView(): {
  view: BeDaView;
  stepPose: ReturnType<typeof useBeDaPoseStore.getState>["stepPose"];
  /** True while loading, on error, and when GET /me/mascot is 404. */
  hidden: boolean;
} {
  const locale = useLocale();
  const user = useAuthStore((s) => s.user);
  const hasAuth = !!user || !!getAccessToken();
  const sessionHappy = useBeDaPoseStore((s) => s.sessionHappy);
  const stepPose = useBeDaPoseStore((s) => s.stepPose);
  const streak = useStreak();
  const query = useQuery({
    queryKey: mascotQueryKey,
    queryFn: fetchMascot,
    enabled: hasAuth,
    staleTime: 30_000,
    retry: 1,
  });

  const snapshot = query.data === undefined ? null : query.data ?? defaultSnapshot();
  const missedDays = resolveMissedDays(snapshot, streak.data ?? null, streakDateKey());
  const view = resolveBeDaView({
    snapshot: snapshot ?? defaultSnapshot(),
    missedDays,
    sessionHappy,
    locale,
  });
  return {
    view,
    stepPose: sessionHappy ? null : stepPose,
    hidden: mascotQueryHidesUI(query),
  };
}
