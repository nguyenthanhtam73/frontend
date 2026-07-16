"use client";

import {
  ArrowRight,
  BookOpen,
  Camera,
  ClipboardList,
  Eye,
  Loader2,
  Lock,
  RefreshCw,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  buildStepsFromHints,
  splitRoutineHints,
} from "@/components/check-in/routine-hint-parser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent } from "@/components/ui/card";
import { fetchSkinCheck } from "@/lib/api/skin-check";
import { apiBaseUrl } from "@/lib/api";
import { authHeaders, getAccessToken } from "@/lib/auth-token";
import type { RoutineStepDTO } from "@/lib/types/routine";
import { streakDateKey } from "@/lib/streak/history";
import { cn } from "@/lib/utils";

import { ApplyConfirmDialog } from "./apply-confirm-dialog";
import {
  CheckInDetailSheet,
  type CheckInDetailEntry,
} from "./check-in-detail-sheet";

type ProgressEntry = {
  id: string;
  check_date: string;
  status?: string;
  tags?: string[];
  symptoms?: string[];
  snippet?: string;
  user_note?: string;
};

type DateRelative = "today" | "yesterday" | "other";

/**
 * Latest check-in context on the Routine page — skin tags, coach snippet, and
 * quick actions linking check-in ↔ routine.
 */
export function CheckInContextCard({
  editLocked = false,
  beginnerSimple = false,
  hasEditorContent = false,
  onApplyHints,
  onApplySuccess,
}: {
  editLocked?: boolean;
  beginnerSimple?: boolean;
  /** True when the editor already has steps/notes that would be overwritten. */
  hasEditorContent?: boolean;
  onApplyHints?: (morning: RoutineStepDTO[], evening: RoutineStepDTO[]) => void;
  onApplySuccess?: () => void;
}) {
  const t = useTranslations("routine.checkInContext");
  const tConditions = useTranslations("checkIn.conditions");
  const tSymptoms = useTranslations("checkIn.symptoms");

  const [entry, setEntry] = useState<ProgressEntry | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "anon" | "empty" | "error"
  >("loading");
  const [detailOpen, setDetailOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [hintsReady, setHintsReady] = useState<boolean | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [cachedHints, setCachedHints] = useState<ReturnType<typeof splitRoutineHints> | null>(
    null,
  );

  const canApply = !editLocked && !beginnerSimple;

  const applyDisabledReason = editLocked
    ? t("applyLocked")
    : beginnerSimple
      ? t("applyBeginner")
      : null;

  const conditionLabel = useCallback(
    (raw: string) => translateSafely(tConditions, raw),
    [tConditions],
  );
  const symptomLabel = useCallback(
    (raw: string) => translateSafely(tSymptoms, raw),
    [tSymptoms],
  );

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      setStatus("anon");
      return;
    }
    setStatus("loading");
    setHintsReady(null);
    setCachedHints(null);
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/progress?range=30&limit=1`,
        { headers: authHeaders() },
      );
      if (!res.ok) {
        setStatus("error");
        return;
      }
      const json = await res.json().catch(() => ({}));
      const list = (json?.data?.entries ?? []) as ProgressEntry[];
      const top = list[0];
      if (!top) {
        setEntry(null);
        setStatus("empty");
      } else {
        setEntry(top);
        setStatus("ready");
      }
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (status !== "ready" || !entry?.id || entry.status !== "completed") {
      setHintsReady(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const detail = await fetchSkinCheck(entry.id);
      if (cancelled) return;
      const split = splitRoutineHints(detail?.analysis?.coach?.routine_hints);
      const total =
        split.morning.length + split.evening.length + split.other.length;
      setCachedHints(split);
      setHintsReady(total > 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [entry, status]);

  const dateInfo = useMemo(
    () => (entry ? formatRelativeDate(entry.check_date, t) : null),
    [entry, t],
  );

  const detailEntry: CheckInDetailEntry | null = useMemo(() => {
    if (!entry || !dateInfo) return null;
    return {
      checkDateLabel: dateInfo.label,
      tags: entry.tags ?? [],
      symptoms: entry.symptoms ?? [],
      snippet: entry.snippet,
      userNote: entry.user_note,
      routineHints: cachedHints ?? undefined,
      tagLabel: conditionLabel,
      symptomLabel,
    };
  }, [entry, dateInfo, cachedHints, conditionLabel, symptomLabel]);

  const detailLabels = useMemo(
    () => ({
      title: t("detailTitle"),
      close: t("detailClose"),
      swipeHint: t("detailSwipeHint"),
      tagsSection: t("detailTagsSection"),
      snippet: t("detailSnippet"),
      userNote: t("detailUserNote"),
      hintsTitle: t("detailHintsTitle"),
      hintsHighlight: t("detailHintsHighlight"),
      am: t("detailAm"),
      pm: t("detailPm"),
      other: t("detailOther"),
      noHints: t("detailNoHints"),
      applyNow: t("applyNow"),
      applyingNow: t("applyingHints"),
      applyDisabled: applyDisabledReason ?? t("applyLocked"),
    }),
    [t, applyDisabledReason],
  );

  function requestApplyHints() {
    if (!canApply || !onApplyHints) return;
    if (hasEditorContent) {
      setConfirmOpen(true);
      return;
    }
    void executeApplyHints();
  }

  async function executeApplyHints() {
    if (!entry?.id || !onApplyHints || !canApply) return;
    setConfirmOpen(false);
    setApplying(true);
    setApplyError(null);
    try {
      let split = cachedHints;
      if (!split) {
        const detail = await fetchSkinCheck(entry.id);
        split = splitRoutineHints(detail?.analysis?.coach?.routine_hints);
        setCachedHints(split);
      }
      const morning = buildStepsFromHints(split.morning);
      const evening = buildStepsFromHints([
        ...split.evening,
        ...split.other,
      ]);
      if (morning.length === 0 && evening.length === 0) {
        setApplyError(t("applyHintsEmpty"));
        return;
      }
      onApplyHints(morning, evening);
      setDetailOpen(false);
      onApplySuccess?.();
    } catch {
      setApplyError(t("applyHintsError"));
    } finally {
      setApplying(false);
    }
  }

  if (status === "loading") {
    return (
      <Card className="border-dashed shadow-sm">
        <CardContent className="flex items-center gap-2 py-4 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {t("loading")}
        </CardContent>
      </Card>
    );
  }

  if (status === "anon") {
    return null;
  }

  if (status === "error") {
    return (
      <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-destructive">{t("errorTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("errorHint")}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} className="min-h-11 shrink-0 self-start sm:min-h-9">
            <RefreshCw className="size-4" aria-hidden />
            {t("retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (status === "empty") {
    return (
      <Card className="overflow-hidden border-primary/30 bg-linear-to-br from-primary/10 via-background to-accent/15 shadow-md ring-1 ring-primary/15">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3.5">
            <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary shadow-sm ring-1 ring-primary/20">
              <Camera className="size-5" aria-hidden />
            </span>
            <div className="space-y-1.5">
              <p className="text-base font-semibold leading-snug">{t("emptyTitle")}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{t("emptyHint")}</p>
            </div>
          </div>
          <ButtonLink href="/check-in" size="lg" className="min-h-11 w-full gap-2 sm:w-auto">
            {t("emptyCta")}
            <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </CardContent>
      </Card>
    );
  }

  const e = entry!;
  const tags = (e.tags ?? []).slice(0, 5);
  const symptoms = (e.symptoms ?? []).slice(0, 4);
  const showApplyButton =
    hintsReady === true && !!onApplyHints && e.status === "completed";
  const snippetLong = (e.snippet?.length ?? 0) > 140;

  return (
    <>
      <Card className="overflow-hidden border-primary/30 bg-linear-to-br from-primary/8 via-background to-accent/12 shadow-md ring-1 ring-primary/15">
        <CardContent className="space-y-4 p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary shadow-sm ring-1 ring-primary/20">
                <BookOpen className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 space-y-1">
                <p className="text-base font-semibold leading-snug tracking-tight">
                  {t("cardTitle")}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">{t("cardSubtitle")}</p>
              </div>
            </div>
            {dateInfo ? (
              <DateBadge label={dateInfo.label} kind={dateInfo.kind} />
            ) : null}
          </div>

          {e.status && e.status !== "completed" ? (
            <Badge
              variant="outline"
              className={cn(
                "text-[11px] uppercase tracking-wider",
                e.status === "failed"
                  ? "border-destructive/30 bg-destructive/10 text-destructive"
                  : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
              )}
            >
              {translateSafely(t, `status.${e.status}`)}
            </Badge>
          ) : null}

          {tags.length > 0 || symptoms.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Badge key={`c-${tag}`} variant="default" className="px-2.5 py-1 text-xs">
                  {conditionLabel(tag)}
                </Badge>
              ))}
              {symptoms.map((s) => (
                <Badge
                  key={`s-${s}`}
                  variant="outline"
                  className="border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-900 dark:text-amber-100"
                >
                  {symptomLabel(s)}
                </Badge>
              ))}
            </div>
          ) : null}

          {e.snippet ? (
            <div className="space-y-1.5 rounded-xl border border-border/60 bg-background/80 px-3.5 py-3 shadow-sm">
              <p className="text-sm leading-relaxed text-foreground/90 line-clamp-3">{e.snippet}</p>
              {snippetLong ? (
                <button
                  type="button"
                  onClick={() => setDetailOpen(true)}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline"
                >
                  <Eye className="size-3.5" aria-hidden />
                  {t("snippetMore")}
                </button>
              ) : null}
            </div>
          ) : null}

          {applyError ? (
            <p className="text-sm text-destructive" role="alert">
              {applyError}
            </p>
          ) : null}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ButtonLink href="/check-in" variant="default" size="lg" className="min-h-11 w-full gap-2">
              <ClipboardList className="size-4 shrink-0" aria-hidden />
              {t("updateJournal")}
            </ButtonLink>

            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-h-11 w-full gap-2"
              onClick={() => setDetailOpen(true)}
            >
              <Sparkles className="size-4 shrink-0" aria-hidden />
              {t("viewDetail")}
            </Button>

            {showApplyButton ? (
              <div className="space-y-1.5 sm:col-span-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="min-h-11 w-full gap-2 bg-primary/10 hover:bg-primary/15"
                  disabled={!canApply || applying}
                  aria-busy={applying}
                  onClick={() => requestApplyHints()}
                >
                  {applying ? (
                    <>
                      <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                      {t("applyingHints")}
                    </>
                  ) : !canApply ? (
                    <>
                      <Lock className="size-4 shrink-0 opacity-70" aria-hidden />
                      {t("applyHints")}
                    </>
                  ) : (
                    <>
                      <WandSparkles className="size-4 shrink-0" aria-hidden />
                      {t("applyHints")}
                    </>
                  )}
                </Button>
                {!canApply && applyDisabledReason ? (
                  <p className="text-center text-xs leading-relaxed text-muted-foreground">
                    {applyDisabledReason}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <ApplyConfirmDialog
        open={confirmOpen}
        title={t("confirmTitle")}
        body={t("confirmBody")}
        cancelLabel={t("confirmCancel")}
        confirmLabel={t("confirmOk")}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void executeApplyHints()}
      />

      <CheckInDetailSheet
        open={detailOpen}
        entry={detailEntry}
        labels={detailLabels}
        canApply={canApply}
        applying={applying}
        onClose={() => setDetailOpen(false)}
        onApply={showApplyButton ? () => requestApplyHints() : undefined}
      />
    </>
  );
}

function DateBadge({ label, kind }: { label: string; kind: DateRelative }) {
  return (
    <Badge
      variant={kind === "today" ? "success" : "outline"}
      className={cn(
        "shrink-0 px-2.5 py-1 text-xs font-semibold",
        kind === "today" && "ring-1 ring-emerald-500/30",
        kind === "yesterday" &&
          "border-indigo-400/40 bg-indigo-500/10 text-indigo-700 ring-1 ring-indigo-400/25 dark:text-indigo-300",
        kind === "other" && "border-border/80 bg-muted/40 text-muted-foreground",
      )}
    >
      {label}
    </Badge>
  );
}

type TranslateFn = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

function translateSafely(
  t: TranslateFn,
  key: string,
  values?: Record<string, string | number | Date>,
): string {
  try {
    return t(key, values);
  } catch {
    return key;
  }
}

function formatRelativeDate(
  iso: string,
  t: TranslateFn,
): { label: string; kind: DateRelative } {
  if (!iso) return { label: "", kind: "other" };
  const parts = iso.split("-").map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) {
    return { label: iso, kind: "other" };
  }
  const target = Date.UTC(parts[0], parts[1] - 1, parts[2]);
  // Align "today" with SkinCheck / streak Vietnam calendar keys.
  const todayKey = streakDateKey();
  const [ty, tm, td] = todayKey.split("-").map((p) => parseInt(p, 10));
  const today = Date.UTC(ty, tm - 1, td);
  const diffDays = Math.round((today - target) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return { label: t("today"), kind: "today" };
  if (diffDays === 1) return { label: t("yesterday"), kind: "yesterday" };
  if (diffDays < 7) return { label: t("daysAgo", { n: diffDays }), kind: "other" };
  return { label: iso, kind: "other" };
}
