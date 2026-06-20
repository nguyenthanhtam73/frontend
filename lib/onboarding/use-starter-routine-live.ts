"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiBaseUrl } from "@/lib/api";
import { fetchSkinProfile } from "@/lib/api/profile";
import { getAccessToken } from "@/lib/auth-token";
import { readCoachWelcomeSession } from "@/lib/onboarding/coach-welcome-session";
import { requestGuestPreviewJob } from "@/lib/onboarding/guest-preview-api";
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

function persistCoachWelcomePatch(patch: Partial<CoachWelcomePayload>): void {
  try {
    const raw = sessionStorage.getItem(COACH_WELCOME_STORAGE_KEY);
    if (!raw) return;
    const p = JSON.parse(raw) as CoachWelcomePayload;
    sessionStorage.setItem(
      COACH_WELCOME_STORAGE_KEY,
      JSON.stringify({
        ...p,
        ...patch,
      }),
    );
  } catch {
    /* ignore storage errors */
  }
}

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
  const [previewJobId, setPreviewJobId] = useState<string | undefined>(
    () => readCoachWelcomeSession()?.previewJobId,
  );
  const initialRoutineRef = useRef<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isGeneratingRef = useRef(false);
  const guestJobRequestedRef = useRef(false);

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

  const finishPollTimeout = useCallback(() => {
    isGeneratingRef.current = false;
    setIsGeneratingRoutine(false);
    setShowFallbackBanner(true);
  }, []);

  const retryAiGeneration = useCallback(async () => {
    const session = readCoachWelcomeSession();
    if (!session?.starterRoutine) return;

    guestJobRequestedRef.current = false;
    setPreviewJobId(undefined);
    beginAiTracking(session.starterRoutine, true);
    setShowFallbackBanner(false);

    const jobId = await requestGuestPreviewJob(session);
    if (jobId) {
      setPreviewJobId(jobId);
      persistCoachWelcomePatch({
        previewJobId: jobId,
        starterRoutinePending: true,
        usedDefaultRoutine: false,
      });
    } else {
      finishPollTimeout();
    }
  }, [beginAiTracking, finishPollTimeout]);

  useEffect(() => {
    if (!enabled) return;
    beginAiTracking(initialStarter, initialPending);
    setPreviewJobId(readCoachWelcomeSession()?.previewJobId);
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
      if (!patch) return;

      if (patch.previewJobId) {
        setPreviewJobId(patch.previewJobId);
        persistCoachWelcomePatch({
          previewJobId: patch.previewJobId,
          starterRoutinePending: patch.starterRoutinePending ?? true,
        });
        if (!isGeneratingRef.current) {
          isGeneratingRef.current = true;
          setIsGeneratingRoutine(true);
          setShowFallbackBanner(false);
        }
      }

      if (!patch.starterRoutine) {
        if (patch.starterRoutinePending === false) {
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

      persistCoachWelcomePatch({
        ...patch,
        starterRoutinePending: false,
      });
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

          persistCoachWelcomePatch({
            starterRoutine: sr,
            starterRoutinePending: false,
          });
          return;
        } catch {
          /* keep polling */
        }
      }
      if (!cancelled) finishPollTimeout();
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [applyStarterFromAi, enabled, finishPollTimeout, isGeneratingRoutine, isGuest]);

  useEffect(() => {
    if (!enabled || !isGeneratingRoutine || !isGuest || previewJobId) return;

    const session = readCoachWelcomeSession();
    if (!session || guestJobRequestedRef.current) return;

    guestJobRequestedRef.current = true;
    let cancelled = false;

    void requestGuestPreviewJob(session).then((jobId) => {
      if (cancelled) return;
      if (jobId) setPreviewJobId(jobId);
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, isGeneratingRoutine, isGuest, previewJobId]);

  useEffect(() => {
    if (!enabled || !isGeneratingRoutine || !isGuest || !previewJobId) return;

    let cancelled = false;
    const poll = async () => {
      for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS && !cancelled; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        if (cancelled) return;
        try {
          const res = await fetch(
            `${apiBaseUrl}/api/v1/onboarding/preview-routine/${encodeURIComponent(previewJobId)}`,
            { headers: { Accept: "application/json" } },
          );
          const payload = (await res.json().catch(() => ({}))) as {
            success?: boolean;
            data?: {
              starter_routine?: StarterRoutineDTO;
              starter_routine_pending?: boolean;
            };
          };
          if (!res.ok || !payload.success || !payload.data?.starter_routine) continue;
          if (payload.data.starter_routine_pending === true) continue;

          const sr = payload.data.starter_routine;
          const baseline = initialRoutineRef.current ?? routineFingerprint(sr);
          const upgraded = routineFingerprint(sr) !== baseline;
          applyStarterFromAi(sr, { upgraded, fallback: !upgraded });

          persistCoachWelcomePatch({
            starterRoutine: sr,
            starterRoutinePending: false,
            previewJobId,
          });
          return;
        } catch {
          /* keep polling */
        }
      }
      if (!cancelled) finishPollTimeout();
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [applyStarterFromAi, enabled, finishPollTimeout, isGeneratingRoutine, isGuest, previewJobId]);

  return {
    starter,
    isGeneratingRoutine,
    showFallbackBanner,
    routineJustUpdated,
    beginAiTracking,
    retryAiGeneration,
  };
}
