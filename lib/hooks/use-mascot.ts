"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";

import { fetchMascot, markMascotGlowSeen, mascotQueryKey, resetMascotGlowSeen } from "@/lib/api/mascot";
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
  /** True for a short beat after the server says `level_up`. */
  glowCelebrate: boolean;
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
  const hidden = mascotQueryHidesUI(query);
  const glowCelebrate = useGlowCelebration(!hidden && view.levelUp);
  return {
    view,
    stepPose: sessionHappy ? null : stepPose,
    hidden,
    glowCelebrate,
  };
}

const GLOW_CELEBRATION_MS = 1600;
const GLOW_CELEBRATION_REDUCED_MS = 1200;

/** Shows the level-up burst once, then POST /me/mascot/glow/seen. */
function useGlowCelebration(levelUp: boolean): boolean {
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | null>(null);
  const wasUp = useRef(false);

  useEffect(() => {
    if (!levelUp) return;
    wasUp.current = true;
    setVisible(true);
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setVisible(false);
      timer.current = null;
    }, reduced ? GLOW_CELEBRATION_REDUCED_MS : GLOW_CELEBRATION_MS);
    void markMascotGlowSeen()
      .then(() => queryClient.invalidateQueries({ queryKey: mascotQueryKey }))
      .catch(() => undefined);
  }, [levelUp, queryClient]);

  useEffect(() => {
    if (levelUp || visible || !wasUp.current) return;
    wasUp.current = false;
    resetMascotGlowSeen();
  }, [levelUp, visible]);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  return visible;
}
