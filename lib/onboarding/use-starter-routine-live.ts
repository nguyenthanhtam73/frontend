"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchSkinProfile } from "@/lib/api/profile";
import { getAccessToken } from "@/lib/auth-token";
import { routineFingerprint } from "@/lib/onboarding/starter-routine-fingerprint";
import { isStarterRoutinePending, parseSnapshotStarter } from "@/lib/onboarding/snapshot";
import {
  COACH_WELCOME_SESSION_EVENT,
  COACH_WELCOME_STORAGE_KEY,
  type CoachWelcomePayload,
  type StarterRoutineDTO,
} from "@/lib/types/starter-routine";

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 20;
const ROUTINE_HIGHLIGHT_MS = 2200;

type UseStarterRoutineLiveOpts = {
  initialStarter: StarterRoutineDTO;
  initialPending: boolean;
  isGuest: boolean;
  enabled?: boolean;
};

export function useStarterRoutineLive({
  initialStarter,
  initialPending,
  isGuest,
  enabled = true,
}: UseStarterRoutineLiveOpts) {
  const [starter, setStarter] = useState(initialStarter);
  const [isGeneratingRoutine, setIsGeneratingRoutine] = useState(initialPending);
  const [showFallbackBanner, setShowFallbackBanner] = useState(false);
  const [routineJustUpdated, setRoutineJustUpdated] = useState(false);
  const initialRoutineRef = useRef<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isGeneratingRef = useRef(false);

  const triggerRoutineHighlight = useCallback(() => {
    setRoutineJustUpdated(true);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => {
      setRoutineJustUpdated(false);
    }, ROUTINE_HIGHLIGHT_MS);
  }, []);

  const applyStarterFromAi = useCallback(
    (next: StarterRoutineDTO, opts: { upgraded: boolean; fallback?: boolean }) => {
      setStarter(next);
      isGeneratingRef.current = false;
      setIsGeneratingRoutine(false);
      if (opts.upgraded) {
        setShowFallbackBanner(false);
        triggerRoutineHighlight();
      } else if (opts.fallback) {
        setShowFallbackBanner(true);
      }
    },
    [triggerRoutineHighlight],
  );

  const beginAiTracking = useCallback((routine: StarterRoutineDTO, pending: boolean) => {
    initialRoutineRef.current = routineFingerprint(routine);
    isGeneratingRef.current = pending;
    setStarter(routine);
    setIsGeneratingRoutine(pending);
    if (pending) setShowFallbackBanner(false);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    beginAiTracking(initialStarter, initialPending);
  }, [beginAiTracking, enabled, initialPending, initialStarter]);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const onSessionPatch = (event: Event) => {
      const patch = (event as CustomEvent<Partial<CoachWelcomePayload>>).detail;
      if (!patch?.starterRoutine) {
        if (patch?.starterRoutinePending === false) {
          isGeneratingRef.current = false;
          setIsGeneratingRoutine(false);
        }
        return;
      }

      const baseline = initialRoutineRef.current;
      const upgraded =
        Boolean(baseline) && routineFingerprint(patch.starterRoutine) !== baseline;

      if (patch.starterRoutinePending === true) {
        beginAiTracking(patch.starterRoutine, true);
        return;
      }

      applyStarterFromAi(patch.starterRoutine, {
        upgraded,
        fallback: isGeneratingRef.current && !upgraded,
      });

      try {
        const raw = sessionStorage.getItem(COACH_WELCOME_STORAGE_KEY);
        if (raw) {
          const p = JSON.parse(raw) as CoachWelcomePayload;
          sessionStorage.setItem(
            COACH_WELCOME_STORAGE_KEY,
            JSON.stringify({
              ...p,
              ...patch,
              starterRoutinePending: false,
            }),
          );
        }
      } catch {
        /* ignore storage errors */
      }
    };

    window.addEventListener(COACH_WELCOME_SESSION_EVENT, onSessionPatch);
    return () => window.removeEventListener(COACH_WELCOME_SESSION_EVENT, onSessionPatch);
  }, [applyStarterFromAi, beginAiTracking, enabled]);

  useEffect(() => {
    if (!enabled || !isGeneratingRoutine || isGuest || !getAccessToken()) return;

    let cancelled = false;
    const poll = async () => {
      for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS && !cancelled; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        if (cancelled) return;
        try {
          const prof = await fetchSkinProfile();
          if (!prof) continue;
          if (isStarterRoutinePending(prof.onboarding_snapshot)) continue;
          const sr = parseSnapshotStarter(prof.onboarding_snapshot);
          if (!sr) continue;

          const baseline = initialRoutineRef.current ?? routineFingerprint(sr);
          const upgraded = routineFingerprint(sr) !== baseline;
          applyStarterFromAi(sr, { upgraded, fallback: !upgraded });

          try {
            const raw = sessionStorage.getItem(COACH_WELCOME_STORAGE_KEY);
            if (raw) {
              const p = JSON.parse(raw) as CoachWelcomePayload;
              sessionStorage.setItem(
                COACH_WELCOME_STORAGE_KEY,
                JSON.stringify({
                  ...p,
                  starterRoutine: sr,
                  starterRoutinePending: false,
                }),
              );
            }
          } catch {
            /* ignore storage errors */
          }
          return;
        } catch {
          /* keep polling */
        }
      }
      if (!cancelled) {
        isGeneratingRef.current = false;
        setIsGeneratingRoutine(false);
        setShowFallbackBanner(true);
      }
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [applyStarterFromAi, enabled, isGeneratingRoutine, isGuest]);

  useEffect(() => {
    if (!enabled || !isGeneratingRoutine || !isGuest) return;

    const timeoutMs = POLL_INTERVAL_MS * POLL_MAX_ATTEMPTS;
    const timer = setTimeout(() => {
      isGeneratingRef.current = false;
      setIsGeneratingRoutine(false);
      setShowFallbackBanner(true);
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [enabled, isGeneratingRoutine, isGuest]);

  return {
    starter,
    isGeneratingRoutine,
    showFallbackBanner,
    routineJustUpdated,
    beginAiTracking,
  };
}
