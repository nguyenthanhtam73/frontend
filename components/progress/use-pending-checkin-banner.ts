"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { apiBaseUrl } from "@/lib/api";
import { fetchSkinCheckResult, isAnalysisSettled } from "@/lib/api/skin-check";
import {
  dismissBannerForCheck,
  isAnalysisProcessing,
  isBannerDismissedForCheck,
  readPersistedCheckInPending,
} from "@/lib/check-in/pending-feedback-session";
import { getAccessToken } from "@/lib/auth-token";
import type { ProgressTimelineDTO } from "@/lib/types/progress";

/** 8s for first 2 min, then 15s; stop polling after 5 min. */
const POLL_FAST_MS = 8000;
const POLL_SLOW_MS = 15000;
const POLL_PHASE_SWITCH_MS = 2 * 60 * 1000;
const MAX_POLL_DURATION_MS = 5 * 60 * 1000;
const EXIT_ANIM_MS = 320;
const ELAPSED_TICK_MS = 1000;

function pollDelayMs(pollElapsedMs: number): number {
  return pollElapsedMs < POLL_PHASE_SWITCH_MS ? POLL_FAST_MS : POLL_SLOW_MS;
}

/** Resolve a candidate check-in id from session or the newest timeline entry. */
async function resolvePendingCheckId(): Promise<{
  checkId: string;
  waitStartedAt: number;
} | null> {
  const fromSession = readPersistedCheckInPending();
  if (fromSession?.checkId) {
    return {
      checkId: fromSession.checkId,
      waitStartedAt: fromSession.startedAt,
    };
  }

  const token = getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(`${apiBaseUrl}/api/v1/progress?range=30`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const raw = await res.json().catch(() => ({}));
    if (!res.ok || !raw?.success || !raw.data) return null;

    const entries = (raw.data as ProgressTimelineDTO).entries;
    const latest = entries?.[0];
    if (!latest || !isAnalysisProcessing(latest.status)) return null;

    const waitStartedAt = latest.created_at
      ? new Date(latest.created_at).getTime()
      : Date.now();
    return { checkId: latest.id, waitStartedAt };
  } catch {
    return null;
  }
}

/**
 * Tracks whether the user's latest check-in is still waiting on AI feedback.
 * Polls lightly while visible and auto-hides when analysis settles.
 */
export function usePendingCheckinBanner() {
  const [show, setShow] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [checkId, setCheckId] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const checkIdRef = useRef<string | null>(null);
  const waitStartedAtRef = useRef<number>(0);
  const pollStartedAtRef = useRef<number>(0);
  const showRef = useRef(false);
  const cancelledRef = useRef(false);

  const clearPoll = useCallback(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  const clearExit = useCallback(() => {
    if (exitTimer.current) {
      clearTimeout(exitTimer.current);
      exitTimer.current = null;
    }
  }, []);

  const clearElapsed = useCallback(() => {
    if (elapsedTimer.current) {
      clearInterval(elapsedTimer.current);
      elapsedTimer.current = null;
    }
  }, []);

  const hideInstant = useCallback(() => {
    clearPoll();
    clearExit();
    clearElapsed();
    showRef.current = false;
    setShow(false);
    setExiting(false);
    setElapsedMs(0);
  }, [clearElapsed, clearExit, clearPoll]);

  const hideAnimated = useCallback(() => {
    clearPoll();
    clearElapsed();
    if (!showRef.current) {
      hideInstant();
      return;
    }
    setExiting(true);
    clearExit();
    exitTimer.current = setTimeout(() => {
      showRef.current = false;
      setShow(false);
      setExiting(false);
      setElapsedMs(0);
    }, EXIT_ANIM_MS);
  }, [clearElapsed, clearExit, clearPoll, hideInstant]);

  const startElapsedTicker = useCallback((startedAt: number) => {
    clearElapsed();
    waitStartedAtRef.current = startedAt;
    const tick = () => {
      setElapsedMs(Math.max(0, Date.now() - waitStartedAtRef.current));
    };
    tick();
    elapsedTimer.current = setInterval(tick, ELAPSED_TICK_MS);
  }, [clearElapsed]);

  const markVisible = useCallback(
    (id: string, waitStartedAt: number) => {
      checkIdRef.current = id;
      setCheckId(id);
      if (!showRef.current) {
        showRef.current = true;
        setShow(true);
        setExiting(false);
      }
      startElapsedTicker(waitStartedAt);
    },
    [startElapsedTicker],
  );

  const verifyAndUpdate = useCallback(
    async (
      id: string,
      waitStartedAt: number,
    ): Promise<"processing" | "settled" | "error"> => {
      if (isBannerDismissedForCheck(id)) {
        hideInstant();
        return "settled";
      }

      const result = await fetchSkinCheckResult(id);
      if (cancelledRef.current) return "error";

      if (result.ok === false) {
        if (result.kind === "not_found") {
          hideAnimated();
          return "settled";
        }
        return "error";
      }

      const status = result.data.analysis.status;
      if (isAnalysisProcessing(status)) {
        markVisible(id, waitStartedAt);
        return "processing";
      }

      if (isAnalysisSettled(status)) {
        hideAnimated();
        return "settled";
      }

      hideAnimated();
      return "settled";
    },
    [hideAnimated, hideInstant, markVisible],
  );

  const schedulePoll = useCallback(
    (id: string, waitStartedAt: number) => {
      clearPoll();

      const pollElapsed = Date.now() - pollStartedAtRef.current;
      if (pollElapsed >= MAX_POLL_DURATION_MS) {
        return;
      }

      const delay = pollDelayMs(pollElapsed);
      pollTimer.current = setTimeout(() => {
        void (async () => {
          const outcome = await verifyAndUpdate(id, waitStartedAt);
          if (cancelledRef.current) return;
          if (outcome === "processing") {
            schedulePoll(id, waitStartedAt);
          }
        })();
      }, delay);
    },
    [clearPoll, verifyAndUpdate],
  );

  const refresh = useCallback(async () => {
    const resolved = await resolvePendingCheckId();
    if (cancelledRef.current) return;
    if (!resolved) {
      hideInstant();
      return;
    }

    pollStartedAtRef.current = Date.now();
    const outcome = await verifyAndUpdate(
      resolved.checkId,
      resolved.waitStartedAt,
    );
    if (cancelledRef.current) return;
    if (outcome === "processing") {
      schedulePoll(resolved.checkId, resolved.waitStartedAt);
    }
  }, [hideInstant, schedulePoll, verifyAndUpdate]);

  const dismiss = useCallback(() => {
    const id = checkIdRef.current;
    if (id) dismissBannerForCheck(id);
    hideInstant();
  }, [hideInstant]);

  useEffect(() => {
    cancelledRef.current = false;
    void refresh();
    return () => {
      cancelledRef.current = true;
      clearPoll();
      clearExit();
      clearElapsed();
    };
  }, [clearElapsed, clearExit, clearPoll, refresh]);

  return {
    show,
    exiting,
    checkId,
    elapsedMs,
    dismiss,
  };
}
