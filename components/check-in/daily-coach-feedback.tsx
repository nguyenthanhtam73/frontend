"use client";

import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Ban,
  Heart,
  Lightbulb,
  Loader2,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";

import { RoutineBridge } from "@/components/check-in/routine-bridge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FeedbackButtons } from "@/components/ui/feedback-buttons";
import { fetchSkinCheck, isAnalysisSettled } from "@/lib/api/skin-check";
import { getAccessToken } from "@/lib/auth-token";
import type { CreateSkinCheckResponseDTO } from "@/lib/types/skin-check";

/** Strip "Sáng:" / "PM:" style prefixes when the card header already shows AM/PM. */
function stripRoutinePrefix(line: string): string {
  const t = line.trim();
  const stripped = t.replace(
    /^(?:sáng|sang|am|morning|tối|toi|pm|evening)\s*:\s*/i,
    "",
  ).trim();
  return stripped || t;
}

/** Split routine_hints by AM/PM-style prefixes (Vi + En). */
function splitRoutineHints(hints: string[] | undefined): {
  morning: string[];
  evening: string[];
  other: string[];
} {
  if (!hints?.length) return { morning: [], evening: [], other: [] };
  const morning: string[] = [];
  const evening: string[] = [];
  const other: string[] = [];
  for (const h of hints) {
    const s = h.trim();
    const low = s.toLowerCase();
    if (
      low.startsWith("am:") ||
      low.startsWith("sáng:") ||
      low.startsWith("sang:") ||
      low.startsWith("morning:")
    ) {
      morning.push(s);
    } else if (
      low.startsWith("pm:") ||
      low.startsWith("tối:") ||
      low.startsWith("toi:") ||
      low.startsWith("evening:")
    ) {
      evening.push(s);
    } else {
      other.push(s);
    }
  }
  return { morning, evening, other };
}

export function DailyCoachFeedback({
  payload,
  onRetry,
}: {
  payload: CreateSkinCheckResponseDTO;
  /** Clears the result view so the user can submit a new check-in. */
  onRetry?: () => void;
}) {
  const t = useTranslations("checkIn.coach");
  const [livePayload, setLivePayload] = useState(payload);
  const [pollTimedOut, setPollTimedOut] = useState(false);

  useEffect(() => {
    setLivePayload(payload);
    setPollTimedOut(false);
  }, [payload]);

  const checkId = payload.check.id;
  const analysisStatus = livePayload.analysis.status;

  useEffect(() => {
    if (isAnalysisSettled(analysisStatus)) return;

    let cancelled = false;
    const started = Date.now();
    const maxMs = 12 * 60 * 1000;
    const intervalMs = 3000;

    const tick = async () => {
      if (cancelled || Date.now() - started > maxMs) {
        if (!cancelled) setPollTimedOut(true);
        return;
      }
      const next = await fetchSkinCheck(checkId);
      if (cancelled || !next) return;
      setLivePayload(next);
      if (!isAnalysisSettled(next.analysis.status)) {
        window.setTimeout(tick, intervalMs);
      }
    };

    void tick();
    return () => {
      cancelled = true;
    };
  }, [checkId, analysisStatus]);

  const a = livePayload.analysis;
  const c = a.coach;

  if (
    !pollTimedOut &&
    (a.status === "pending" || a.status === "processing")
  ) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 py-8 text-muted-foreground" role="status">
          <Loader2 className="size-6 shrink-0 animate-spin text-primary" aria-hidden />
          <p className="text-sm">{t("processing")}</p>
        </CardContent>
      </Card>
    );
  }

  if (
    pollTimedOut &&
    (a.status === "pending" || a.status === "processing")
  ) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="space-y-3 pt-6">
          <div
            className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200"
            role="alert"
          >
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            {t("failedTitle")}
          </div>
          <p className="text-sm text-muted-foreground">{t("pollTimeout")}</p>
          {onRetry ? (
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onRetry}>
              <RefreshCw className="size-4" aria-hidden />
              {t("retry")}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  if (a.status === "failed" || (c?.error_message && a.status !== "completed")) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center gap-2 font-medium text-destructive" role="alert">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            {t("failedTitle")}
          </div>
          <p className="text-sm text-muted-foreground">
            {c?.error_message || t("failedUnknown")}
          </p>
          {onRetry ? (
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onRetry}>
              <RefreshCw className="size-4" aria-hidden />
              {t("retry")}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  // Defensive fallback: backend reported `completed` but no coach payload (rare —
  // typically a parser glitch or a moderation block that didn't set status=failed).
  // We still want to give the user something useful instead of a blank scroll.
  if (!c) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="space-y-3 pt-6">
          <div className="flex items-center gap-2 font-medium text-amber-900 dark:text-amber-200" role="alert">
            <AlertTriangle className="size-4 shrink-0" aria-hidden />
            {t("failedTitle")}
          </div>
          <p className="text-sm text-muted-foreground">{t("failedUnknown")}</p>
          {onRetry ? (
            <Button type="button" variant="outline" size="sm" className="gap-2" onClick={onRetry}>
              <RefreshCw className="size-4" aria-hidden />
              {t("retry")}
            </Button>
          ) : null}
        </CardContent>
      </Card>
    );
  }

  const split = splitRoutineHints(c.routine_hints);
  const g = c.skin_score_gauges;
  const hasGauges =
    !!g &&
    (g.hydration != null ||
      g.clarity != null ||
      g.barrier != null ||
      g.overall != null);

  return (
    <div
      className="space-y-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500"
      data-coach-feedback
    >
      {/* Hero — visually anchors the feedback block. */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/12 via-accent/40 to-background px-5 py-5 shadow-sm sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute -right-12 -top-12 size-32 rounded-full bg-primary/20 blur-3xl" aria-hidden />
        <div className="relative flex items-start gap-3">
          <div className="rounded-full bg-background/80 p-2 shadow-sm ring-1 ring-primary/20">
            <Sparkles className="size-4 text-primary" aria-hidden />
          </div>
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              {t("title")}
            </p>
            {c.summary_notes ? (
              <p className="text-sm font-medium leading-snug text-foreground sm:text-base">
                {c.summary_notes}
              </p>
            ) : (
              <p className="text-sm leading-snug text-muted-foreground">
                {t("processing")}
              </p>
            )}
          </div>
        </div>
      </div>

      {c.strengths && c.strengths.length > 0 ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="space-y-2 pt-5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <Heart className="size-3.5" aria-hidden />
              {t("praise")}
            </div>
            <ul className="space-y-1.5 text-sm leading-relaxed">
              {c.strengths.map((line, i) => (
                <li key={`${i}-${line.slice(0, 40)}`} className="flex gap-2">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {c.situation_summary ? (
        <Card>
          <CardContent className="space-y-2 pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("todaySummary")}
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap">
              {c.situation_summary}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {c.concern_alignment ? (
        <Card className="border-blue-500/15 bg-blue-500/[0.03]">
          <CardContent className="space-y-2 pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-900/80 dark:text-blue-200/90">
              {t("alignment")}
            </p>
            <p className="text-sm leading-relaxed text-foreground/90">
              {c.concern_alignment}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {hasGauges ? (
        <Card className="border-muted">
          <CardContent className="space-y-3 pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("softGauges")}
            </p>
            <div className="space-y-2.5">
              {g!.overall != null ? (
                <ScoreBar label={t("gaugeOverall")} value={g!.overall} emphasis />
              ) : null}
              {g!.hydration != null ? (
                <ScoreBar label={t("gaugeHydration")} value={g!.hydration} />
              ) : null}
              {g!.clarity != null ? (
                <ScoreBar label={t("gaugeClarity")} value={g!.clarity} />
              ) : null}
              {g!.barrier != null ? (
                <ScoreBar label={t("gaugeBarrier")} value={g!.barrier} />
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {(split.morning.length > 0 ||
        split.evening.length > 0 ||
        split.other.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {split.morning.length > 0 ? (
            <Card className="border-amber-500/25 bg-gradient-to-b from-amber-500/5 to-transparent">
              <CardContent className="space-y-2 pt-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Sun className="size-4 text-amber-500" aria-hidden />
                  {t("routineAm")}
                </div>
                <ul className="list-inside list-decimal space-y-1.5 text-sm">
                  {split.morning.map((line, i) => (
                    <li key={`am-${i}`}>{stripRoutinePrefix(line)}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
          {split.evening.length > 0 ? (
            <Card className="border-indigo-500/25 bg-gradient-to-b from-indigo-500/5 to-transparent">
              <CardContent className="space-y-2 pt-5">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Moon className="size-4 text-indigo-500" aria-hidden />
                  {t("routinePm")}
                </div>
                <ul className="list-inside list-decimal space-y-1.5 text-sm">
                  {split.evening.map((line, i) => (
                    <li key={`pm-${i}`}>{stripRoutinePrefix(line)}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}

      {/* Bridge between today's AI feedback and the dedicated /routine page.
          - Lets users one-tap apply the suggested AM/PM routine.
          - Renders a quick-tick panel for today's saved routine so they
            can mark steps done without leaving this page. */}
      <RoutineBridge
        suggestedMorning={split.morning}
        suggestedEvening={split.evening}
        hasAuth={!!getAccessToken()}
      />

      {split.other.length > 0 ? (
        <Card>
          <CardContent className="space-y-2 pt-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("routineAdjust")}
            </p>
            <ul className="list-inside list-disc space-y-1.5 text-sm">
              {split.other.map((line, i) => (
                <li key={`o-${i}`}>{stripRoutinePrefix(line)}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {c.improvements && c.improvements.length > 0 ? (
        <Card>
          <CardContent className="space-y-3 pt-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Lightbulb className="size-4 text-amber-600" aria-hidden />
              {t("tips")}
            </div>
            <ul className="space-y-3">
              {c.improvements.map((im, idx) => (
                <li
                  key={`tip-${idx}-${im.tip.slice(0, 24)}`}
                  className="rounded-xl border bg-muted/30 p-3 text-sm transition-colors hover:bg-muted/50"
                >
                  <p className="font-medium leading-snug">{im.tip}</p>
                  {im.why ? (
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                      <span className="font-semibold uppercase tracking-wider text-foreground/80">
                        {t("why")}
                      </span>{" "}
                      {im.why}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {c.avoid_or_patch && c.avoid_or_patch.length > 0 ? (
        <Card className="border-orange-500/20">
          <CardContent className="space-y-2 pt-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-orange-800 dark:text-orange-200">
              <Ban className="size-4 shrink-0" aria-hidden />
              {t("avoid")}
            </div>
            <ul className="list-inside list-disc space-y-1 text-sm">
              {c.avoid_or_patch.map((line, i) => (
                <li key={`b-${i}`}>{line}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {(c.safety_reminders && c.safety_reminders.length > 0) ||
      c.medical_disclaimer ? (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="space-y-3 pt-5">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900 dark:text-emerald-200">
              <ShieldCheck className="size-4 shrink-0" aria-hidden />
              {t("safety")}
            </div>
            {c.safety_reminders && c.safety_reminders.length > 0 ? (
              <ul className="list-inside list-disc space-y-1 text-sm">
                {c.safety_reminders.map((line, i) => (
                  <li key={`s-${i}`}>{line}</li>
                ))}
              </ul>
            ) : null}
            {c.medical_disclaimer ? (
              <p className="rounded-md bg-background/60 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                {c.medical_disclaimer}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {a.model_version || (a.prompt_version != null && a.prompt_version > 0) ? (
        <p className="text-center text-[10px] text-muted-foreground">
          {a.model_version ? t("modelLine", { model: a.model_version }) : null}
          {a.model_version && a.prompt_version != null && a.prompt_version > 0 ? " · " : null}
          {a.prompt_version != null && a.prompt_version > 0
            ? t("coachPromptVersion", { v: a.prompt_version })
            : null}
        </p>
      ) : null}

      {/* Feedback loop — votes feed back into BuildPriorFeedbackContext on
          subsequent coach calls so the AI gradually adapts to this user. */}
      <FeedbackButtons
        targetType="skin_analysis"
        targetId={a.id}
      />
    </div>
  );
}

/** Soft 0-1 gauge bar; color-coded so users feel the read instantly. emphasis = used for "overall" with a slightly bigger track. */
function ScoreBar({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  const clamped = Math.min(1, Math.max(0, value));
  const pct = Math.round(clamped * 100);
  // Color buckets keep the bar honest: low = soft amber (care needed), mid = neutral, high = teal/green (on-track).
  const color =
    clamped < 0.4
      ? "bg-amber-500/80"
      : clamped < 0.7
        ? "bg-primary/70"
        : "bg-emerald-500/80";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className={emphasis ? "font-medium text-foreground" : undefined}>
          {label}
        </span>
        <span className="tabular-nums">{pct}%</span>
      </div>
      <div
        className={`${emphasis ? "h-2.5" : "h-2"} overflow-hidden rounded-full bg-muted`}
        role="presentation"
      >
        <div
          className={`${color} h-full rounded-full transition-[width] duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
