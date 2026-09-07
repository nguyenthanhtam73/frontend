"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  GUEST_AI_WAIT_MS,
  GUEST_AI_WAIT_TICK_MS,
  type GuestAiWaitPhase,
  guestAiWaitProgress,
  guestAiWaitStatusStep,
  isGuestAiWaitActive,
} from "@/lib/check-in/guest-ai-wait";

/**
 * Local analyzing theater after a guest photo check-in.
 * Does not poll GET /skin-checks — there is no server id until claim.
 */
export function useGuestAiWait() {
  const [phase, setPhase] = useState<GuestAiWaitPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [statusStep, setStatusStep] = useState(0);
  const startedAtRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    if (doneRef.current) {
      clearTimeout(doneRef.current);
      doneRef.current = null;
    }
  }, []);

  const beginSubmit = useCallback(() => {
    clearTimers();
    startedAtRef.current = 0;
    setProgress(0);
    setStatusStep(0);
    setPhase("submitting");
  }, [clearTimers]);

  const skip = useCallback(() => {
    clearTimers();
    setProgress(100);
    setPhase("done");
  }, [clearTimers]);

  const reset = useCallback(() => {
    clearTimers();
    startedAtRef.current = 0;
    setProgress(0);
    setStatusStep(0);
    setPhase("idle");
  }, [clearTimers]);

  const startAnalyzing = useCallback(() => {
    clearTimers();
    const startedAt = Date.now();
    startedAtRef.current = startedAt;
    setProgress(guestAiWaitProgress(0));
    setStatusStep(0);
    setPhase("processing");

    tickRef.current = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setProgress(guestAiWaitProgress(elapsed));
      setStatusStep(guestAiWaitStatusStep(elapsed));
    }, GUEST_AI_WAIT_TICK_MS);

    doneRef.current = setTimeout(() => {
      clearTimers();
      setProgress(100);
      setPhase("done");
    }, GUEST_AI_WAIT_MS);
  }, [clearTimers]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return {
    phase,
    progress,
    statusStep,
    isWaiting: isGuestAiWaitActive(phase),
    beginSubmit,
    startAnalyzing,
    skip,
    reset,
  };
}
