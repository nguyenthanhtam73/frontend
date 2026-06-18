"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useQueryClient } from "@tanstack/react-query";

import { apiBaseUrl } from "@/lib/api";
import { authHeaders, getAccessToken } from "@/lib/auth-token";
import { usageQueryKey } from "@/lib/api/usage";
import type {
  SuggestJobCreatedDTO,
  SuggestJobStatusDTO,
  SuggestRoutineDTO,
} from "@/lib/types/routine";

import { localId } from "./routine-helpers";

/** sessionStorage — resume polling after SPA navigation or tab return. */
const SESSION_KEY = "dadiary_routine_suggest_job";
const JOB_TTL_MS = 15 * 60 * 1000;

/** Smart polling: fast for 15s, then slower; cap total attempts. */
const POLL_FAST_MS = 2000;
const POLL_SLOW_MS = 3500;
const POLL_PHASE_SWITCH_MS = 15_000;
const MAX_POLL_ATTEMPTS = 12;
const MAX_NETWORK_RETRIES = 3;
const NETWORK_RETRY_MS = 1200;
const PROGRESS_TICK_MS = 900;

const IS_DEV = process.env.NODE_ENV === "development";

/** Dedupes resume across React Strict Mode double-mounts and rapid reloads. */
let activeResumePromise: Promise<void> | null = null;
let activeResumeJobId: string | null = null;

export type SuggestPhase =
  | "idle"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export type SuggestErrorCode =
  | "need_auth"
  | "network"
  | "timeout"
  | "expired"
  | "quota_exceeded"
  | "premium_required"
  | "ai_failed"
  | "unknown";

/** Structured error — map `code` to i18n in the editor. */
export type SuggestError = {
  code: SuggestErrorCode;
  detail?: string;
};

/** Toast event — editor maps `variant` to localized strings. */
export type SuggestToast = {
  kind: "ok" | "err";
  variant: "completed" | "failed" | "cancelled" | "resumed";
};

export function isSuggestErrorRetryable(code: SuggestErrorCode): boolean {
  return (
    code === "network" ||
    code === "timeout" ||
    code === "expired" ||
    code === "ai_failed" ||
    code === "unknown"
  );
}

type PersistedJob = {
  jobId: string;
  startedAt: number;
};

type PollMeta = {
  attempt: number;
  startedAt: number;
  networkRetries: number;
};

type StatusFetchResult =
  | { ok: true; data: SuggestJobStatusDTO }
  | { ok: false; kind: "expired" }
  | { ok: false; kind: "api"; code: SuggestErrorCode; detail?: string }
  | { ok: false; kind: "network" };

function devLog(...args: unknown[]) {
  if (IS_DEV) {
    console.log("[AI Suggest]", ...args);
  }
}

function elapsedMs(startedAt: number): number {
  return startedAt > 0 ? Date.now() - startedAt : 0;
}

function pollDelayMs(elapsedMs: number): number {
  return elapsedMs < POLL_PHASE_SWITCH_MS ? POLL_FAST_MS : POLL_SLOW_MS;
}

function readPersistedJob(): PersistedJob | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedJob;
    if (!parsed?.jobId || !parsed.startedAt) return null;
    if (Date.now() - parsed.startedAt > JOB_TTL_MS) {
      sessionStorage.removeItem(SESSION_KEY);
      devLog("session expired", parsed.jobId);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function persistJob(job: PersistedJob) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(job));
  } catch {
    /* quota / private mode */
  }
}

function clearPersistedJob() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

function mapApiErrorCode(
  json: { error?: { code?: string; message?: string } },
): SuggestErrorCode {
  const code = json.error?.code;
  if (code === "quota_exceeded") return "quota_exceeded";
  if (code === "premium_required") return "premium_required";
  if (code === "not_found") return "expired";
  return "unknown";
}

function normalizeSuggestion(data: SuggestRoutineDTO): SuggestRoutineDTO {
  return {
    ...data,
    morning: data.morning.map((s) => ({ ...s, id: s.id || localId() })),
    evening: data.evening.map((s) => ({ ...s, id: s.id || localId() })),
  };
}

async function fetchJobStatus(jobId: string): Promise<StatusFetchResult> {
  try {
    const res = await fetch(
      `${apiBaseUrl}/api/v1/routines/suggest/status?job_id=${encodeURIComponent(jobId)}`,
      { headers: authHeaders() },
    );
    const json = await res.json().catch(() => ({}));

    if (res.status === 404) {
      return { ok: false, kind: "expired" };
    }

    if (!res.ok || !json?.success) {
      return {
        ok: false,
        kind: "api",
        code: mapApiErrorCode(json),
        detail: json.error?.message,
      };
    }

    return { ok: true, data: json.data as SuggestJobStatusDTO };
  } catch {
    return { ok: false, kind: "network" };
  }
}

/**
 * Async AI routine suggestion — POST job + smart poll without blocking UI.
 *
 * Polling strategy:
 *   - First 15s: every 2s
 *   - After 15s: every 3.5s
 *   - Max 12 attempts (~40–50s) then timeout
 *   - Transient network errors: up to 3 quick retries before next poll tick
 *
 * Only one job may run at a time. Job id is stored in sessionStorage so a
 * return visit probes server status before resuming poll.
 */
export function useRoutineSuggest(locale: string, skillMode: string | null) {
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<SuggestPhase>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<SuggestRoutineDTO | null>(null);
  const [error, setError] = useState<SuggestError | null>(null);
  const [focusNote, setFocusNote] = useState("");
  const [fakeProgress, setFakeProgress] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const [toast, setToast] = useState<SuggestToast | null>(null);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortedRef = useRef(false);
  const jobIdRef = useRef<string | null>(null);
  const pollMetaRef = useRef<PollMeta>({ attempt: 0, startedAt: 0, networkRetries: 0 });
  const processingRef = useRef(false);

  const clearToast = useCallback(() => setToast(null), []);

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

  const stopPolling = useCallback(() => {
    clearPoll();
    clearProgress();
  }, [clearPoll, clearProgress]);

  const fail = useCallback(
    (code: SuggestErrorCode, detail?: string, opts?: { silentToast?: boolean }) => {
      stopPolling();
      clearPersistedJob();
      const id = jobIdRef.current;
      jobIdRef.current = null;
      processingRef.current = false;
      setJobId(null);
      setPhase("failed");
      setError({ code, detail });
      setCancelling(false);
      devLog("failed", {
        jobId: id,
        code,
        detail,
        attempt: pollMetaRef.current.attempt,
        elapsedMs: elapsedMs(pollMetaRef.current.startedAt),
      });
      if (!opts?.silentToast) {
        setToast({ kind: "err", variant: "failed" });
      }
    },
    [stopPolling],
  );

  /** Reset to idle after cancel — keeps focus note, clears all job artifacts. */
  const settleCancelled = useCallback(
    (opts?: { toast?: boolean }) => {
      stopPolling();
      clearPersistedJob();
      abortedRef.current = false;
      jobIdRef.current = null;
      processingRef.current = false;
      pollMetaRef.current = { attempt: 0, startedAt: 0, networkRetries: 0 };
      setJobId(null);
      setPhase("idle");
      setFakeProgress(0);
      setCancelling(false);
      setError(null);
      if (opts?.toast) {
        setToast({ kind: "ok", variant: "cancelled" });
      }
    },
    [stopPolling],
  );

  const resetIdle = useCallback(() => {
    stopPolling();
    abortedRef.current = false;
    jobIdRef.current = null;
    processingRef.current = false;
    pollMetaRef.current = { attempt: 0, startedAt: 0, networkRetries: 0 };
    setJobId(null);
    setPhase("idle");
    setFakeProgress(0);
    setCancelling(false);
    setError(null);
  }, [stopPolling]);

  const dismiss = useCallback(() => {
    clearPersistedJob();
    resetIdle();
    setSuggestion(null);
  }, [resetIdle]);

  const schedulePoll = useCallback((id: string) => {
    if (abortedRef.current) return;
    const elapsed = Date.now() - pollMetaRef.current.startedAt;
    const delay = pollDelayMs(elapsed);
    devLog("schedule poll", {
      jobId: id,
      attempt: pollMetaRef.current.attempt,
      delayMs: delay,
      elapsedMs: elapsed,
    });
    pollTimer.current = setTimeout(() => {
      void pollStatusRef.current(id);
    }, delay);
  }, []);

  const completeJob = useCallback(
    (data: SuggestRoutineDTO) => {
      const id = jobIdRef.current;
      stopPolling();
      clearPersistedJob();
      setCancelling(false);
      processingRef.current = false;
      jobIdRef.current = null;
      setJobId(null);
      setSuggestion(normalizeSuggestion(data));
      setPhase("completed");
      setError(null);
      setFakeProgress(100);
      setToast({ kind: "ok", variant: "completed" });
      void queryClient.invalidateQueries({ queryKey: usageQueryKey });
      devLog("completed", {
        jobId: id,
        morning: data.morning.length,
        evening: data.evening.length,
        attempt: pollMetaRef.current.attempt,
        elapsedMs: elapsedMs(pollMetaRef.current.startedAt),
      });
    },
    [queryClient, stopPolling],
  );

  /** Apply a status payload — shared by poll loop and resume probe. */
  const applyStatus = useCallback(
    (id: string, status: SuggestJobStatusDTO, fromResume = false): "continue" | "done" => {
      devLog("status", {
        jobId: id,
        status: status.status,
        attempt: pollMetaRef.current.attempt,
        elapsedMs: elapsedMs(pollMetaRef.current.startedAt),
        fromResume,
      });

      if (status.status === "processing") {
        schedulePoll(id);
        return "continue";
      }

      stopPolling();
      clearPersistedJob();
      setCancelling(false);

      if (status.status === "completed" && status.suggestion) {
        completeJob(status.suggestion);
        return "done";
      }

      if (status.status === "cancelled") {
        devLog("terminal cancelled", { jobId: id, fromResume });
        settleCancelled({ toast: !fromResume });
        return "done";
      }

      fail("ai_failed", status.error?.trim());
      return "done";
    },
    [completeJob, fail, schedulePoll, settleCancelled, stopPolling],
  );

  const pollStatusRef = useRef<(id: string) => Promise<void>>(async () => {});

  pollStatusRef.current = async (id: string) => {
    if (abortedRef.current) return;

    pollMetaRef.current.attempt += 1;
    if (pollMetaRef.current.attempt > MAX_POLL_ATTEMPTS) {
      fail("timeout");
      return;
    }

    const result = await fetchJobStatus(id);
    if (abortedRef.current) return;

    if (result.ok === false) {
      if (result.kind === "expired") {
        fail("expired");
        return;
      }
      if (result.kind === "api") {
        fail(result.code, result.detail);
        return;
      }

      pollMetaRef.current.networkRetries += 1;
      devLog("poll network error", {
        jobId: id,
        retries: pollMetaRef.current.networkRetries,
        attempt: pollMetaRef.current.attempt,
        elapsedMs: elapsedMs(pollMetaRef.current.startedAt),
      });
      if (pollMetaRef.current.networkRetries < MAX_NETWORK_RETRIES) {
        pollTimer.current = setTimeout(() => {
          void pollStatusRef.current(id);
        }, NETWORK_RETRY_MS);
        return;
      }

      pollMetaRef.current.networkRetries = 0;
      if (pollMetaRef.current.attempt >= MAX_POLL_ATTEMPTS) {
        fail("network");
      } else {
        schedulePoll(id);
      }
      return;
    }

    pollMetaRef.current.networkRetries = 0;
    applyStatus(id, result.data);
  };

  const startProgress = useCallback(() => {
    clearProgress();
    setFakeProgress(8);
    progressTimer.current = setInterval(() => {
      setFakeProgress((p) => {
        if (p >= 92) return p;
        if (p < 40) return p + 7;
        if (p < 75) return p + 4;
        return p + 2;
      });
    }, PROGRESS_TICK_MS);
  }, [clearProgress]);

  const beginJob = useCallback(
    (id: string, startedAt: number, opts?: { resume?: boolean }) => {
      abortedRef.current = false;
      processingRef.current = true;
      jobIdRef.current = id;
      setJobId(id);
      setPhase("processing");
      setError(null);
      if (!opts?.resume) {
        setSuggestion(null);
      }
      persistJob({ jobId: id, startedAt });
      startProgress();
      devLog("begin job", { jobId: id, resume: !!opts?.resume });
      void pollStatusRef.current(id);
    },
    [startProgress],
  );

  const requestSuggestion = useCallback(
    async (overrideFocus?: string) => {
      if (!getAccessToken()) {
        setPhase("failed");
        setError({ code: "need_auth" });
        setToast({ kind: "err", variant: "failed" });
        return;
      }

      if (processingRef.current) {
        devLog("request blocked — job already in flight");
        return;
      }

      stopPolling();
      abortedRef.current = false;
      setCancelling(false);
      setError(null);
      clearToast();

      const note = (overrideFocus ?? focusNote).trim();
      const body = {
        locale,
        skill_mode: skillMode ?? "",
        ...(note ? { focus_note: note } : {}),
      };

      const startedAt = Date.now();

      try {
        devLog("creating job");
        const res = await fetch(`${apiBaseUrl}/api/v1/routines/suggest`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(body),
        });
        const json = await res.json().catch(() => ({}));
        if (abortedRef.current) return;

        if (!res.ok || !json?.success || !json?.data?.job_id) {
          const code = mapApiErrorCode(json);
          fail(code, json.error?.message);
          return;
        }

        const created = json.data as SuggestJobCreatedDTO;
        pollMetaRef.current = { attempt: 0, startedAt, networkRetries: 0 };
        beginJob(created.job_id, startedAt);
      } catch {
        if (!abortedRef.current) {
          fail("network");
        }
      }
    },
    [beginJob, clearToast, fail, focusNote, locale, skillMode, stopPolling],
  );

  const cancelSuggestion = useCallback(async () => {
    if (phase !== "processing" || cancelling) return;

    abortedRef.current = true;
    setCancelling(true);
    stopPolling();

    const id = jobIdRef.current;
    clearPersistedJob();

    if (id) {
      try {
        const res = await fetch(
          `${apiBaseUrl}/api/v1/routines/suggest?job_id=${encodeURIComponent(id)}`,
          { method: "DELETE", headers: authHeaders() },
        );
        if (!res.ok && res.status !== 404) {
          setCancelling(false);
          abortedRef.current = false;
          setPhase("failed");
          setError({ code: "network" });
          setToast({ kind: "err", variant: "failed" });
          return;
        }
      } catch {
        setCancelling(false);
        abortedRef.current = false;
        setPhase("failed");
        setError({ code: "network" });
        setToast({ kind: "err", variant: "failed" });
        return;
      }
    }

    jobIdRef.current = null;
    processingRef.current = false;
    settleCancelled({ toast: true });
    devLog("cancel success", {
      jobId: id,
      elapsedMs: elapsedMs(pollMetaRef.current.startedAt),
    });
  }, [cancelling, phase, settleCancelled, stopPolling]);

  const dismissError = useCallback(() => {
    setError(null);
    clearToast();
    if (phase === "failed") {
      setPhase("idle");
      setFakeProgress(0);
    }
  }, [clearToast, phase]);

  /**
   * Resume after reload: probe server status once, then either show preview,
   * surface an error, or continue polling. Deduped via module-level promise.
   */
  const resumeFromSession = useCallback(async () => {
    const persisted = readPersistedJob();
    if (!persisted || !getAccessToken()) return;

    if (processingRef.current) {
      devLog("resume skipped — already processing", {
        jobId: persisted.jobId,
        activeResumeJobId,
      });
      return;
    }

    const elapsed = Date.now() - persisted.startedAt;
    devLog("resume probe", {
      jobId: persisted.jobId,
      elapsedMs: elapsed,
      activeResumeJobId,
    });

    pollMetaRef.current = {
      attempt: Math.min(MAX_POLL_ATTEMPTS, Math.floor(elapsed / POLL_FAST_MS)),
      startedAt: persisted.startedAt,
      networkRetries: 0,
    };

    abortedRef.current = false;
    processingRef.current = true;
    jobIdRef.current = persisted.jobId;
    setJobId(persisted.jobId);
    setPhase("processing");
    setError(null);
    startProgress();

    const result = await fetchJobStatus(persisted.jobId);
    if (abortedRef.current) return;

    if (result.ok === false) {
      processingRef.current = false;
      jobIdRef.current = null;
      setJobId(null);
      stopPolling();
      clearPersistedJob();
      setFakeProgress(0);

      devLog("resume probe failed", {
        jobId: persisted.jobId,
        kind: result.kind,
        elapsedMs: elapsed,
      });

      if (result.kind === "expired") {
        fail("expired");
        return;
      }
      if (result.kind === "api") {
        fail(result.code, result.detail);
        return;
      }
      fail("network");
      return;
    }

    devLog("resume probe ok", {
      jobId: persisted.jobId,
      status: result.data.status,
      elapsedMs: elapsed,
    });

    const outcome = applyStatus(persisted.jobId, result.data, true);
    if (outcome === "continue") {
      return;
    }

    processingRef.current = false;
  }, [applyStatus, fail, startProgress, stopPolling]);

  useEffect(() => {
    const persisted = readPersistedJob();
    if (!persisted || !getAccessToken()) return;

    if (activeResumePromise) {
      devLog("resume skipped — promise in flight", {
        activeResumeJobId,
        requested: persisted.jobId,
      });
      return;
    }

    activeResumeJobId = persisted.jobId;
    activeResumePromise = resumeFromSession().finally(() => {
      activeResumePromise = null;
      activeResumeJobId = null;
    });
  }, [resumeFromSession]);

  useEffect(() => {
    return () => {
      clearPoll();
      clearProgress();
    };
  }, [clearPoll, clearProgress]);

  const suggesting = phase === "processing";
  const showErrorPanel = phase === "failed" && !suggestion && error != null;
  const canRetry = error != null && isSuggestErrorRetryable(error.code);
  const suggestBusy = suggesting || showErrorPanel || cancelling;

  return {
    phase,
    suggesting,
    suggestBusy,
    cancelling,
    showErrorPanel,
    canRetry,
    jobId,
    suggestion,
    error,
    toast,
    clearToast,
    focusNote,
    setFocusNote,
    fakeProgress,
    requestSuggestion,
    cancelSuggestion,
    dismiss,
    dismissError,
  };
}
