"use client";

import {
  ArrowRight,
  Check,
  CheckCircle2,
  Loader2,
  Moon,
  Sparkles,
  Sun,
  Undo2,
  WandSparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApplyConfirmDialog } from "@/components/routine/parts/apply-confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ToastBanner } from "@/components/ui/toast-banner";
import { Link } from "@/i18n/navigation";
import { apiBaseUrl } from "@/lib/api";
import { authHeaders } from "@/lib/auth-token";
import type { RoutineDTO, RoutineStepDTO } from "@/lib/types/routine";
import { cn } from "@/lib/utils";

import { localId } from "@/components/routine/routine-helpers";

import { buildStepsFromHints, suggestionToken } from "./routine-hint-parser";

const AUTO_SAVE_MS = 400;
const TOAST_MS = 4500;

/**
 * Bridge between Daily Check-in feedback and the Routine page.
 */
export function RoutineBridge({
  suggestedMorning,
  suggestedEvening,
  hasAuth,
}: {
  suggestedMorning: string[];
  suggestedEvening: string[];
  hasAuth: boolean;
}) {
  const t = useTranslations("checkIn.routineBridge");

  const [routine, setRoutine] = useState<RoutineDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [appliedToken, setAppliedToken] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [justToggledId, setJustToggledId] = useState<string | null>(null);

  const [unapplying, setUnapplying] = useState(false);

  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toggleAnimTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const routineBeforeApplyRef = useRef<RoutineDTO | null>(null);

  const hasSuggestion =
    suggestedMorning.length > 0 || suggestedEvening.length > 0;
  const token = useMemo(
    () => suggestionToken(suggestedMorning, suggestedEvening),
    [suggestedMorning, suggestedEvening],
  );

  const isApplied = appliedToken === token && hasSuggestion;
  const showApply = hasSuggestion && hasAuth && !isApplied;

  const suggestedSteps = useMemo(
    () => ({
      morning: buildStepsFromHints(suggestedMorning),
      evening: buildStepsFromHints(suggestedEvening),
    }),
    [suggestedMorning, suggestedEvening],
  );

  useEffect(() => {
    if (!hasAuth) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/routines`, {
          headers: authHeaders(),
        });
        if (!res.ok) {
          if (!cancelled) setLoadError(t("loadError"));
          return;
        }
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (json?.success && json?.data) {
          setRoutine(json.data as RoutineDTO);
        }
      } catch {
        if (!cancelled) setLoadError(t("loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasAuth, t]);

  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      if (savedFlashTimer.current) clearTimeout(savedFlashTimer.current);
      if (toggleAnimTimer.current) clearTimeout(toggleAnimTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const id = window.setTimeout(() => setToastMsg(null), TOAST_MS);
    return () => clearTimeout(id);
  }, [toastMsg]);

  const persistRoutine = useCallback(
    async (next: RoutineDTO): Promise<RoutineDTO | null> => {
      const body = {
        morning: next.morning.map(stripStep),
        evening: next.evening.map(stripStep),
        notes: next.notes ?? "",
        source:
          next.source === "ai_suggested" ? "ai_suggested" : "manual",
        skill_mode: next.skill_mode ?? "",
      };
      const res = await fetch(`${apiBaseUrl}/api/v1/routines`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("save_failed");
      const json = await res.json().catch(() => ({}));
      if (!json?.success || !json?.data) throw new Error("save_failed");
      const saved = json.data as RoutineDTO;
      setRoutine(saved);
      return saved;
    },
    [],
  );

  const applySuggested = useCallback(async () => {
    if (!hasSuggestion || !hasAuth) return;
    setApplying(true);
    setApplyError(null);
    routineBeforeApplyRef.current = routine
      ? {
          ...routine,
          morning: routine.morning.map((s) => ({ ...s })),
          evening: routine.evening.map((s) => ({ ...s })),
        }
      : null;
    try {
      const next: RoutineDTO = {
        user_id: routine?.user_id ?? "",
        routine_date: routine?.routine_date ?? "",
        morning: suggestedSteps.morning.map((s) => ({
          ...s,
          id: localId(),
          completed: false,
        })),
        evening: suggestedSteps.evening.map((s) => ({
          ...s,
          id: localId(),
          completed: false,
        })),
        notes: routine?.notes ?? "",
        source: "ai_suggested",
        skill_mode: routine?.skill_mode ?? "",
        saved: true,
      };
      const saved = await persistRoutine(next);
      if (saved) {
        setAppliedToken(token);
        setToastMsg(t("applySuccess"));
      }
    } catch {
      setApplyError(t("applyError"));
    } finally {
      setApplying(false);
      setConfirmOpen(false);
    }
  }, [hasAuth, hasSuggestion, persistRoutine, routine, suggestedSteps, t, token]);

  const undoApply = useCallback(async () => {
    if (!hasAuth || !isApplied) return;
    setUnapplying(true);
    setApplyError(null);
    try {
      const prev = routineBeforeApplyRef.current;
      const next: RoutineDTO = prev ?? {
        user_id: routine?.user_id ?? "",
        routine_date: routine?.routine_date ?? "",
        morning: [],
        evening: [],
        notes: routine?.notes ?? "",
        source: "manual",
        skill_mode: routine?.skill_mode ?? "",
        saved: true,
      };
      await persistRoutine({ ...next, source: "manual" });
      setAppliedToken(null);
      routineBeforeApplyRef.current = null;
      setToastMsg(t("unapplySuccess"));
    } catch {
      setApplyError(t("unapplyError"));
    } finally {
      setUnapplying(false);
    }
  }, [hasAuth, isApplied, persistRoutine, routine, t]);

  function requestApply() {
    if (!hasSuggestion || !hasAuth) return;
    const existingSteps =
      (routine?.morning.length ?? 0) + (routine?.evening.length ?? 0);
    if (existingSteps > 0) {
      setConfirmOpen(true);
      return;
    }
    void applySuggested();
  }

  function toggleStep(section: "morning" | "evening", id: string) {
    if (!routine) return;
    const updated: RoutineDTO = {
      ...routine,
      [section]: routine[section].map((s) =>
        s.id === id ? { ...s, completed: !s.completed } : s,
      ),
    };
    setRoutine(updated);
    setJustToggledId(id);
    if (toggleAnimTimer.current) clearTimeout(toggleAnimTimer.current);
    toggleAnimTimer.current = setTimeout(() => setJustToggledId(null), 550);

    if (!hasAuth) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaving(true);
      try {
        await persistRoutine(updated);
        setSavedFlash(true);
        if (savedFlashTimer.current) clearTimeout(savedFlashTimer.current);
        savedFlashTimer.current = setTimeout(() => setSavedFlash(false), 1800);
      } catch {
        setLoadError(t("saveError"));
      } finally {
        setAutoSaving(false);
      }
    }, AUTO_SAVE_MS);
  }

  if (!hasSuggestion && !routine && !loading) {
    return null;
  }

  const morning = routine?.morning ?? [];
  const evening = routine?.evening ?? [];
  const totalSteps = morning.length + evening.length;
  const doneSteps =
    morning.filter((s) => s.completed).length +
    evening.filter((s) => s.completed).length;

  return (
    <>
      <ApplyConfirmDialog
        open={confirmOpen}
        title={t("applyConfirmTitle")}
        body={t("applyConfirmBody", {
          am: morning.length,
          pm: evening.length,
          newAm: suggestedSteps.morning.length,
          newPm: suggestedSteps.evening.length,
        })}
        cancelLabel={t("applyConfirmCancel")}
        confirmLabel={t("applyConfirmOk")}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void applySuggested()}
      />

      <Card className="border-primary/25 bg-linear-to-br from-primary/5 via-accent/15 to-background">
        <CardContent className="space-y-4 pt-5">
          {toastMsg ? (
            <ToastBanner kind="ok" message={toastMsg} onDismiss={() => setToastMsg(null)} />
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
                <WandSparkles className="size-3" aria-hidden />
                {t("title")}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {hasSuggestion ? t("subtitle") : t("subtitleNoSuggestion")}
              </p>
            </div>
            <Link
              href="/routine"
              className="inline-flex shrink-0 items-center gap-1 self-start rounded-full border border-primary/30 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
            >
              {t("openFull")}
              <ArrowRight className="size-3" aria-hidden />
            </Link>
          </div>

          {isApplied ? (
            <div className="flex flex-col gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/8 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                {t("appliedStatus")}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void undoApply()}
                disabled={applying || unapplying}
                className="min-h-11 gap-1.5 self-start text-xs text-muted-foreground hover:text-foreground sm:min-h-9 sm:self-auto"
              >
                {unapplying ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Undo2 className="size-3.5" aria-hidden />
                )}
                {t("unapplyCta")}
              </Button>
            </div>
          ) : null}

          {showApply ? (
            <div className="rounded-xl border border-primary/30 bg-background/80 p-3 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold leading-snug">
                    {t("applyTitle")}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {t("applyHint", {
                      am: suggestedSteps.morning.length,
                      pm: suggestedSteps.evening.length,
                    })}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={requestApply}
                  disabled={applying || !hasAuth}
                  className="min-h-11 gap-1.5 sm:min-h-9"
                >
                  {applying ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      {t("applying")}
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" aria-hidden />
                      {t("applyCta")}
                    </>
                  )}
                </Button>
              </div>
              {applyError ? (
                <p className="mt-2 text-xs text-destructive" role="alert">
                  {applyError}
                </p>
              ) : null}
              {!hasAuth ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("needAuth")}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
                {t("panelTitle")}
              </p>
              <span
                className={cn(
                  "text-[11px] tabular-nums transition-colors",
                  autoSaving
                    ? "text-primary"
                    : savedFlash
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground",
                )}
                aria-live="polite"
              >
                {autoSaving
                  ? t("saving")
                  : savedFlash
                    ? t("savedJustNow")
                    : totalSteps > 0
                      ? t("doneCount", { done: doneSteps, total: totalSteps })
                      : ""}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 rounded-xl border border-dashed bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                {t("loading")}
              </div>
            ) : totalSteps === 0 ? (
              <div className="space-y-2 rounded-xl border border-dashed bg-muted/30 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
                <p>{t("emptyHint")}</p>
                <Link
                  href="/routine"
                  className="inline-flex min-h-11 items-center gap-1 font-medium text-primary underline-offset-4 hover:underline sm:min-h-9"
                >
                  {t("emptyCta")}
                  <ArrowRight className="size-3" aria-hidden />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <QuickColumn
                  icon={<Sun className="size-3.5 text-amber-500" aria-hidden />}
                  label={t("am")}
                  steps={morning}
                  justToggledId={justToggledId}
                  onToggle={(id) => toggleStep("morning", id)}
                  emptyLabel={t("amEmpty")}
                  doneLabel={t("doneShort")}
                  toggleOnLabel={t("toggleOn")}
                  toggleOffLabel={t("toggleOff")}
                  disabled={!hasAuth}
                />
                <QuickColumn
                  icon={<Moon className="size-3.5 text-indigo-500" aria-hidden />}
                  label={t("pm")}
                  steps={evening}
                  justToggledId={justToggledId}
                  onToggle={(id) => toggleStep("evening", id)}
                  emptyLabel={t("pmEmpty")}
                  doneLabel={t("doneShort")}
                  toggleOnLabel={t("toggleOn")}
                  toggleOffLabel={t("toggleOff")}
                  disabled={!hasAuth}
                />
              </div>
            )}

            {loadError ? (
              <p className="text-xs text-destructive" role="alert">
                {loadError}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function QuickColumn({
  icon,
  label,
  steps,
  justToggledId,
  onToggle,
  emptyLabel,
  doneLabel,
  toggleOnLabel,
  toggleOffLabel,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  steps: RoutineStepDTO[];
  justToggledId: string | null;
  onToggle: (id: string) => void;
  emptyLabel: string;
  doneLabel: string;
  toggleOnLabel: string;
  toggleOffLabel: string;
  disabled: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card/70 p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold">
        {icon}
        <span>{label}</span>
        <span className="ml-auto text-[11px] font-medium text-muted-foreground tabular-nums">
          {steps.length > 0
            ? `${steps.filter((s) => s.completed).length}/${steps.length}`
            : ""}
        </span>
      </div>
      {steps.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="space-y-1.5">
          {steps.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onToggle(s.id)}
                disabled={disabled}
                aria-pressed={!!s.completed}
                aria-label={s.completed ? toggleOnLabel : toggleOffLabel}
                className={cn(
                  "group flex w-full min-h-11 items-start gap-2.5 rounded-lg border px-2.5 py-1.5 text-left text-xs transition-all duration-300 ease-out sm:min-h-9 sm:py-1",
                  s.completed
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border bg-background hover:bg-muted/60",
                  justToggledId === s.id &&
                    "motion-safe:scale-[0.97] motion-safe:ring-2 motion-safe:ring-primary/35",
                  disabled && "opacity-60",
                )}
              >
                <span
                  className={cn(
                    "mt-px inline-flex size-5 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ease-out",
                    s.completed
                      ? "scale-110 border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-transparent group-hover:border-primary/50",
                    justToggledId === s.id &&
                      s.completed &&
                      "motion-safe:animate-in motion-safe:zoom-in-75 motion-safe:duration-300",
                  )}
                  aria-hidden
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 whitespace-normal break-words font-medium leading-snug transition-opacity duration-200",
                    s.completed && "line-through opacity-70",
                  )}
                >
                  {s.title}
                </span>
                {s.completed ? (
                  <span className="mt-px shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    {doneLabel}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function stripStep(s: RoutineStepDTO): RoutineStepDTO {
  return {
    id: s.id,
    title: s.title.trim(),
    category: (s.category ?? "other").trim(),
    notes: (s.notes ?? "").trim(),
    completed: !!s.completed,
  };
}
