"use client";

import { useTranslations } from "next-intl";
import {
  AlertTriangle,
  Ban,
  Lightbulb,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
} from "lucide-react";

import { RoutineBridge } from "@/components/check-in/routine-bridge";
import { splitRoutineHints } from "@/components/check-in/routine-hint-parser";
import { ProductSuggestionsCard } from "@/components/coach/product-suggestions-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FeedbackButtons } from "@/components/ui/feedback-buttons";
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

/**
 * Renders settled AI coach feedback. Polling / loading states are handled
 * upstream by `useCheckInFeedback` + `AiFeedbackLoading`.
 */
export function DailyCoachFeedback({
  payload,
  onRetry,
}: {
  payload: CreateSkinCheckResponseDTO;
  /** Clears the result view so the user can submit a new check-in. */
  onRetry?: () => void;
}) {
  const t = useTranslations("checkIn.coach");

  const a = payload.analysis;
  const c = a.coach;

  // Defensive fallback: backend reported `completed` but no coach payload (rare —
  // typically a parser glitch or a moderation block that didn't set status=failed).
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

      <ProductSuggestionsCard
        suggestions={c.product_suggestions}
        source="daily_feedback"
        contextId={a.id}
      />

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

      <FeedbackButtons
        targetType="skin_analysis"
        targetId={a.id}
      />
    </div>
  );
}

/** Soft 0-1 gauge bar; color-coded so users feel the read instantly. */
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
