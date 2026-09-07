"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { useToast } from "@/hooks/use-toast";
import {
  fetchSkinCheckResult,
  isAnalysisSettled,
  reanalyzeSkinCheck,
} from "@/lib/api/skin-check";
import {
  applySkinCheckToProgressEntry,
  canShowReanalyzeCta,
  classifyReanalyzeError,
  pollUntilSkinCheckSettled,
  type ReanalyzeErrorKind,
} from "@/lib/progress/reanalyze";
import type { ProgressEntryDTO } from "@/lib/types/progress";

/**
 * POST /skin-checks/:id/reanalyze then poll GET until analysis settles.
 * Cadence matches check-in feedback (`useCheckInFeedback`).
 */
export function useProgressReanalyze(
  entry: ProgressEntryDTO,
  onEntryChange: (next: ProgressEntryDTO) => void,
) {
  const t = useTranslations("progress.entry");
  const { error: toastError } = useToast();
  const [inFlight, setInFlight] = useState(false);

  const entryRef = useRef(entry);
  const onChangeRef = useRef(onEntryChange);
  const inFlightRef = useRef(false);
  const abortedRef = useRef(false);

  entryRef.current = entry;
  onChangeRef.current = onEntryChange;

  useEffect(() => {
    abortedRef.current = false;
    return () => {
      abortedRef.current = true;
    };
  }, []);

  const toastFor = useCallback(
    (kind: ReanalyzeErrorKind) => {
      if (kind === "aborted") return;
      const key =
        kind === "validation"
          ? "reanalyzeNoPhotos"
          : kind === "daily_limit"
            ? "reanalyzeDailyLimit"
            : kind === "rate_limit"
              ? "reanalyzeRateLimit"
              : kind === "timeout"
                ? "reanalyzeTimeout"
                : kind === "network"
                  ? "reanalyzeNetwork"
                  : "reanalyzeError";
      toastError(t(key));
    },
    [t, toastError],
  );

  const run = useCallback(async () => {
    const current = entryRef.current;
    if (inFlightRef.current || !canShowReanalyzeCta(current)) return;

    inFlightRef.current = true;
    setInFlight(true);

    const patch = (data: Parameters<typeof applySkinCheckToProgressEntry>[1]) => {
      onChangeRef.current(applySkinCheckToProgressEntry(entryRef.current, data));
    };

    try {
      const posted = await reanalyzeSkinCheck(current.id);
      if (abortedRef.current) return;
      patch(posted);

      if (isAnalysisSettled(posted.analysis.status)) {
        return;
      }

      await pollUntilSkinCheckSettled(current.id, {
        fetchResult: fetchSkinCheckResult,
        onTick: patch,
        isAborted: () => abortedRef.current,
      });
    } catch (err) {
      if (abortedRef.current) return;
      toastFor(classifyReanalyzeError(err));
      onChangeRef.current(current);
    } finally {
      inFlightRef.current = false;
      if (!abortedRef.current) setInFlight(false);
    }
  }, [toastFor]);

  return { inFlight, run };
}
