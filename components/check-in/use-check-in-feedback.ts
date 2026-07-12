"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  fetchSkinCheckResult,
  isAnalysisSettled,
} from "@/lib/api/skin-check";
import {
  clearPersistedCheckInPending,
  persistCheckInPending,
  readPersistedCheckInPending,
} from "@/lib/check-in/pending-feedback-session";
import type { CreateSkinCheckResponseDTO } from "@/lib/types/skin-check";

/** Smart polling: 1s for first 20s, then 2.5s; hard stop at TIMEOUT_MS. */
const POLL_FAST_MS = 1000;
const POLL_SLOW_MS = 2500;
const POLL_PHASE_SWITCH_MS = 20_000;
const TIMEOUT_MS = 160_000;
/** After this long the coach is unusually slow — surface a reassuring "taking longer" hint. */
const SLOW_WARNING_MS = 90_000;
const MAX_NETWORK_RETRIES = 3;
const NETWORK_RETRY_MS = 1500;
const PROGRESS_TICK_MS = 800;
const PROGRESS_CAP = 90;

const IS_DEV = process.env.NODE_ENV === "development";

/** Dedupes resume across React Strict Mode double-mounts. */
let activeResumePromise: Promise<void> | null = null;
let activeResumeCheckId: string | null = null;

export type CheckInFeedbackPhase =
  | "idle"
  | "submitting"
  | "processing"
  | "completed"
  | "timeout"
  | "failed";

type PollMeta = {
  startedAt: number;
  networkRetries: number;
};

function devLog(...args: unknown[]) {
  if (IS_DEV) {
    console.log("[CheckIn Feedback]", ...args);
  }
}

function elapsedMs(startedAt: number): number {
  return startedAt > 0 ? Date.now() - startedAt : 0;
}

function pollDelayMs(elapsed: number): number {
  return elapsed < POLL_PHASE_SWITCH_MS ? POLL_FAST_MS : POLL_SLOW_MS;
}

function isAnalysisFailed(payload: CreateSkinCheckResponseDTO): boolean {
  const status = payload.analysis.status;
  const coachErr = payload.analysis.coach?.error_message;
  return status === "failed" || (!!coachErr && status !== "completed");
}

function isAnalysisComplete(payload: CreateSkinCheckResponseDTO): boolean {
  return (
    payload.analysis.status === "completed" && !!payload.analysis.coach
  );
}

/**
 * Manages async AI feedback after a skin check-in: smart polling, timeout,
 * session resume on reload, and fake progress for the loading UI.
 */
export function useCheckInFeedback() {
  const [phase, setPhase] = useState<CheckInFeedbackPhase>("idle");
  const [payload, setPayload] = useState<CreateSkinCheckResponseDTO | null>(
    null,
  );
  const [checkId, setCheckId] = useState<string | null>(null);
  const [fakeProgress, setFakeProgress] = useState(0);
  const [statusStep, setStatusStep] = useState(0);
  const [isSlow, setIsSlow] = useState(false);
  // Wall-clock start of the current poll, exposed so the loading UI can render a
  // live elapsed timer that stays accurate across page-reload resume.
  const [pollStartedAt, setPollStartedAt] = useState(0);
  const [failureMessage, setFailureMessage] = useState<string | null>(null);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortedRef = useRef(false);
  const checkIdRef = useRef<string | null>(null);
  const pollMetaRef = useRef<PollMeta>({ startedAt: 0, networkRetries: 0 });
  const pollingRef = useRef(false);
  const payloadRef = useRef<CreateSkinCheckResponseDTO | null>(null);

  const syncPayload = useCallback((data: CreateSkinCheckResponseDTO | null) => {
    payloadRef.current = data;
    setPayload(data);
  }, []);

  const clearPoll = useCallback(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  const clearProgress = useCallback(() => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  }, []);

  const clearStatusStep = useCallback(() => {
    if (statusTimer.current) {
      clearInterval(statusTimer.current);
      statusTimer.current = null;
    }
  }, []);

  const stopPolling = useCallback(() => {
    clearPoll();
    clearProgress();
    clearStatusStep();
    pollingRef.current = false;
  }, [clearPoll, clearProgress, clearStatusStep]);

  const startProgressTimers = useCallback((startedAt: number) => {
    clearProgress();
    clearStatusStep();
    setFakeProgress(0);
    setStatusStep(0);
    setIsSlow(false);

    progressTimer.current = setInterval(() => {
      const elapsed = elapsedMs(startedAt);
      const ratio = Math.min(1, elapsed / (TIMEOUT_MS * 0.95));
      setFakeProgress(Math.min(PROGRESS_CAP, Math.round(ratio * PROGRESS_CAP)));
      if (elapsed >= SLOW_WARNING_MS) setIsSlow(true);
    }, PROGRESS_TICK_MS);

    statusTimer.current = setInterval(() => {
      setStatusStep((s) => s + 1);
    }, 8000);
  }, [clearProgress, clearStatusStep]);

  const settleCompleted = useCallback(
    (data: CreateSkinCheckResponseDTO) => {
      stopPolling();
      clearPersistedCheckInPending();
      checkIdRef.current = null;
      pollingRef.current = false;
      setCheckId(null);
      syncPayload(data);
      setPhase("completed");
      setFailureMessage(null);
      setFakeProgress(100);
      devLog("completed", { checkId: data.check.id });
    },
    [stopPolling, syncPayload],
  );

  const settleFailed = useCallback(
    (data: CreateSkinCheckResponseDTO | null, message?: string) => {
      stopPolling();
      clearPersistedCheckInPending();
      checkIdRef.current = null;
      pollingRef.current = false;
      setCheckId(null);
      if (data) syncPayload(data);
      setPhase("failed");
      setFailureMessage(
        message ??
          data?.analysis.coach?.error_message ??
          null,
      );
      devLog("failed", { checkId: data?.check.id, message });
    },
    [stopPolling, syncPayload],
  );

  const settleTimeout = useCallback(
    (data: CreateSkinCheckResponseDTO | null) => {
      stopPolling();
      if (data) syncPayload(data);
      setPhase("timeout");
      setFailureMessage(null);
      devLog("timeout", { checkId: checkIdRef.current });
    },
    [stopPolling, syncPayload],
  );

  const schedulePoll = useCallback(
    (id: string) => {
      if (abortedRef.current) return;
      const elapsed = elapsedMs(pollMetaRef.current.startedAt);
      if (elapsed >= TIMEOUT_MS) {
        settleTimeout(payloadRef.current);
        return;
      }
      const delay = pollDelayMs(elapsed);
      devLog("schedule poll", { checkId: id, delayMs: delay, elapsedMs: elapsed });
      pollTimer.current = setTimeout(() => {
        void pollOnceRef.current(id);
      }, delay);
    },
    [settleTimeout],
  );

  const applyPayload = useCallback(
    (data: CreateSkinCheckResponseDTO): "done" | "continue" => {
      syncPayload(data);

      if (isAnalysisComplete(data)) {
        settleCompleted(data);
        return "done";
      }

      if (isAnalysisFailed(data)) {
        settleFailed(data);
        return "done";
      }

      if (isAnalysisSettled(data.analysis.status)) {
        settleFailed(data);
        return "done";
      }

      return "continue";
    },
    [settleCompleted, settleFailed, syncPayload],
  );

  const pollOnceRef = useRef<(id: string) => Promise<void>>(async () => {});

  pollOnceRef.current = async (id: string) => {
    if (abortedRef.current) return;

    const elapsed = elapsedMs(pollMetaRef.current.startedAt);
    if (elapsed >= TIMEOUT_MS) {
      settleTimeout(payloadRef.current);
      return;
    }

    const result = await fetchSkinCheckResult(id);
    if (abortedRef.current) return;

    if (result.ok) {
      pollMetaRef.current.networkRetries = 0;
      const outcome = applyPayload(result.data);
      if (outcome === "continue") {
        schedulePoll(id);
      }
      return;
    }

    if (result.kind === "not_found") {
      settleFailed(null, undefined);
      return;
    }

    pollMetaRef.current.networkRetries += 1;
    devLog("poll network error", {
      checkId: id,
      retries: pollMetaRef.current.networkRetries,
    });

    if (pollMetaRef.current.networkRetries < MAX_NETWORK_RETRIES) {
      pollTimer.current = setTimeout(() => {
        void pollOnceRef.current(id);
      }, NETWORK_RETRY_MS);
      return;
    }

    pollMetaRef.current.networkRetries = 0;
    schedulePoll(id);
  };

  const beginPolling = useCallback(
    (id: string, initial: CreateSkinCheckResponseDTO, startedAt?: number) => {
      abortedRef.current = false;
      checkIdRef.current = id;
      pollingRef.current = true;
      const ts = startedAt ?? Date.now();
      pollMetaRef.current = { startedAt: ts, networkRetries: 0 };

      setPollStartedAt(ts);
      setCheckId(id);
      syncPayload(initial);
      setPhase("processing");
      setFailureMessage(null);
      persistCheckInPending({ checkId: id, startedAt: ts });
      startProgressTimers(ts);

      const outcome = applyPayload(initial);
      if (outcome === "continue") {
        schedulePoll(id);
      }
    },
    [applyPayload, schedulePoll, startProgressTimers, syncPayload],
  );

  /** Call when POST /skin-checks succeeds. */
  const onSubmitSuccess = useCallback(
    (data: CreateSkinCheckResponseDTO) => {
      const id = data.check.id;
      devLog("submit success", { checkId: id, status: data.analysis.status });
      beginPolling(id, data);
    },
    [beginPolling],
  );

  /** Enter submitting phase before the multipart POST. */
  const beginSubmit = useCallback(() => {
    abortedRef.current = false;
    stopPolling();
    setPhase("submitting");
    setFailureMessage(null);
  }, [stopPolling]);

  /** Return to idle after a submit error (form shows its own banner). */
  const onSubmitError = useCallback(() => {
    setPhase("idle");
  }, []);

  /** Stop waiting — check-in stays saved on server. */
  const cancelWait = useCallback(() => {
    abortedRef.current = true;
    stopPolling();
    clearPersistedCheckInPending();
    checkIdRef.current = null;
    pollingRef.current = false;
    setCheckId(null);
    syncPayload(null);
    setPhase("idle");
    setFakeProgress(0);
    setStatusStep(0);
    setIsSlow(false);
    setFailureMessage(null);
    devLog("cancelled wait");
  }, [stopPolling, syncPayload]);

  /** Stop UI polling but keep session so user can resume from /check-in later. */
  const dismissWait = useCallback(() => {
    abortedRef.current = true;
    stopPolling();
    pollingRef.current = false;
    setPhase("idle");
    setFakeProgress(0);
    setStatusStep(0);
    setIsSlow(false);
    devLog("dismissed wait", { checkId: checkIdRef.current });
  }, [stopPolling]);

  /** Resume polling after timeout (same check-in id). */
  const retryPolling = useCallback(() => {
    const id = checkIdRef.current ?? payloadRef.current?.check.id;
    const data = payloadRef.current;
    if (!id || !data) return;
    beginPolling(id, data, Date.now());
  }, [beginPolling]);

  /** Clear feedback so the user can submit a fresh check-in. */
  const resetFeedback = useCallback(() => {
    abortedRef.current = true;
    stopPolling();
    clearPersistedCheckInPending();
    checkIdRef.current = null;
    pollingRef.current = false;
    setCheckId(null);
    syncPayload(null);
    setPhase("idle");
    setFakeProgress(0);
    setStatusStep(0);
    setIsSlow(false);
    setFailureMessage(null);
  }, [stopPolling, syncPayload]);

  const resumeFromSession = useCallback(async () => {
    const pending = readPersistedCheckInPending();
    if (!pending) return;

    if (
      activeResumePromise &&
      activeResumeCheckId === pending.checkId
    ) {
      await activeResumePromise;
      return;
    }

    activeResumeCheckId = pending.checkId;
    activeResumePromise = (async () => {
      devLog("resume session", pending);
      const result = await fetchSkinCheckResult(pending.checkId);
      if (result.ok === false) {
        if (result.kind === "not_found") {
          clearPersistedCheckInPending();
        }
        return;
      }

      const data = result.data;
      if (isAnalysisComplete(data)) {
        settleCompleted(data);
        return;
      }
      if (isAnalysisFailed(data)) {
        settleFailed(data);
        return;
      }

      if (elapsedMs(pending.startedAt) >= TIMEOUT_MS) {
        checkIdRef.current = pending.checkId;
        setCheckId(pending.checkId);
        syncPayload(data);
        setPhase("timeout");
        return;
      }

      beginPolling(pending.checkId, data, pending.startedAt);
    })();

    try {
      await activeResumePromise;
    } finally {
      activeResumePromise = null;
      activeResumeCheckId = null;
    }
  }, [beginPolling, settleCompleted, settleFailed, syncPayload]);

  useEffect(() => {
    void resumeFromSession();
    return () => {
      abortedRef.current = true;
      stopPolling();
    };
  }, [resumeFromSession, stopPolling]);

  return {
    phase,
    payload,
    checkId,
    fakeProgress,
    statusStep,
    isSlow,
    startedAt: pollStartedAt,
    failureMessage,
    beginSubmit,
    onSubmitSuccess,
    onSubmitError,
    cancelWait,
    dismissWait,
    retryPolling,
    resetFeedback,
    isWaiting: phase === "submitting" || phase === "processing",
  };
}
