"use client";

import {
  ArrowRight,
  Check,
  Loader2,
  Moon,
  Sparkles,
  Sun,
  WandSparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { apiBaseUrl } from "@/lib/api";
import { authHeaders } from "@/lib/auth-token";
import type { RoutineDTO, RoutineStepDTO } from "@/lib/types/routine";
import { cn } from "@/lib/utils";

import { localId } from "@/components/routine/routine-helpers";

import { buildStepsFromHints, suggestionToken } from "./routine-hint-parser";

/**
 * Bridge between Daily Check-in feedback and the Routine page.
 *
 * Two jobs in one card so the user has a single, low-friction surface:
 *   1. **Apply** — turn the AI coach's `routine_hints` into structured AM/PM
 *      steps and POST them to /api/v1/routines (source = "ai_suggested").
 *   2. **Quick tick** — once a routine exists for today, render compact rows
 *      with a checkbox per step. Toggling debounces a silent autosave so the
 *      user can mark steps done without leaving the check-in page.
 *
 * Mobile-first considerations:
 *   - Touch targets ≥ 44px on phones; tighter on desktop.
 *   - Single column by default, two columns from `sm:` breakpoint.
 *   - Sticky autosave hint stays subtle (no toast spam).
 *   - All network errors surface inline — no native alert().
 */
export function RoutineBridge({
  suggestedMorning,
  suggestedEvening,
  hasAuth,
}: {
  /** AM lines from `coach.routine_hints` (already grouped by `splitRoutineHints`). */
  suggestedMorning: string[];
  /** PM lines from `coach.routine_hints`. */
  suggestedEvening: string[];
  /** Skip network calls when the user isn't signed in. */
  hasAuth: boolean;
}) {
  const t = useTranslations("checkIn.routineBridge");

  const [routine, setRoutine] = useState<RoutineDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [autoSaving, setAutoSaving] = useState(false);
  const [appliedToken, setAppliedToken] = useState<string | null>(null);

  // Debounce ref — silent autosave coalesces rapid taps into one POST.
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasSuggestion =
    suggestedMorning.length > 0 || suggestedEvening.length > 0;
  const token = useMemo(
    () => suggestionToken(suggestedMorning, suggestedEvening),
    [suggestedMorning, suggestedEvening],
  );

  // Hide the Apply button once we've successfully replaced today's routine
  // with this exact suggestion (so re-renders don't tempt a second apply).
  const showApply = hasSuggestion && hasAuth && appliedToken !== token;

  const suggestedSteps = useMemo(
    () => ({
      morning: buildStepsFromHints(suggestedMorning),
      evening: buildStepsFromHints(suggestedEvening),
    }),
    [suggestedMorning, suggestedEvening],
  );

  // ---- initial load -----------------------------------------------------
  // Fetch today's routine so the quick panel has something to render. We
  // tolerate empty/anon responses gracefully — the panel just shows the
  // "no routine yet" hint (and the Apply CTA above it remains the primary
  // action).
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

  // Cancel any pending autosave on unmount.
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, []);

  // ---- persistence ------------------------------------------------------
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

  async function applySuggested() {
    if (!hasSuggestion || !hasAuth) return;
    setApplying(true);
    setApplyError(null);
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
      if (saved) setAppliedToken(token);
    } catch {
      setApplyError(t("applyError"));
    } finally {
      setApplying(false);
    }
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
    if (!hasAuth) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaving(true);
      try {
        await persistRoutine(updated);
      } catch {
        // Best-effort autosave: surface a soft message but don't block UX.
        setLoadError(t("saveError"));
      } finally {
        setAutoSaving(false);
      }
    }, 600);
  }

  // ---- render -----------------------------------------------------------
  // Hide the whole bridge for anon users when there's no suggestion either.
  // (We don't want to surface a meaningless empty card after an unauth check-in.)
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
    <Card className="border-primary/25 bg-linear-to-br from-primary/5 via-accent/15 to-background">
      <CardContent className="space-y-4 pt-5">
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

        {/* Apply CTA — only when we have a coach suggestion that hasn't been
            applied yet. Stays prominent so users notice it. */}
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
                onClick={() => void applySuggested()}
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
              <p className="mt-2 text-xs text-destructive">{applyError}</p>
            ) : null}
            {!hasAuth ? (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("needAuth")}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Quick panel — current routine with check toggles. */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-foreground/80">
              {t("panelTitle")}
            </p>
            <span
              className={cn(
                "text-[11px] tabular-nums",
                autoSaving ? "text-primary" : "text-muted-foreground",
              )}
              aria-live="polite"
            >
              {autoSaving
                ? t("saving")
                : appliedToken === token && hasSuggestion
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
            <div className="rounded-xl border border-dashed bg-muted/30 px-3 py-3 text-xs leading-relaxed text-muted-foreground">
              {t("emptyHint")}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <QuickColumn
                icon={
                  <Sun className="size-3.5 text-amber-500" aria-hidden />
                }
                label={t("am")}
                steps={morning}
                onToggle={(id) => toggleStep("morning", id)}
                emptyLabel={t("amEmpty")}
                doneLabel={t("doneShort")}
                toggleOnLabel={t("toggleOn")}
                toggleOffLabel={t("toggleOff")}
                disabled={!hasAuth}
              />
              <QuickColumn
                icon={
                  <Moon className="size-3.5 text-indigo-500" aria-hidden />
                }
                label={t("pm")}
                steps={evening}
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
            <p className="text-xs text-destructive">{loadError}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickColumn({
  icon,
  label,
  steps,
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
                  "group flex w-full min-h-11 items-center gap-2.5 rounded-lg border px-2.5 py-1.5 text-left text-xs transition-colors sm:min-h-9 sm:py-1",
                  s.completed
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border bg-background hover:bg-muted/60",
                  disabled && "opacity-60",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                    s.completed
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-transparent group-hover:border-primary/50",
                  )}
                  aria-hidden
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate font-medium leading-snug",
                    s.completed && "line-through opacity-70",
                  )}
                >
                  {s.title}
                </span>
                {s.completed ? (
                  <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
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

/** Minimal step shape the API expects. Mirrors `routine-helpers.stripStep`. */
function stripStep(s: RoutineStepDTO): RoutineStepDTO {
  return {
    id: s.id,
    title: s.title.trim(),
    category: (s.category ?? "other").trim(),
    notes: (s.notes ?? "").trim(),
    completed: !!s.completed,
  };
}
