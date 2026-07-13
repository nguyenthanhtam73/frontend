"use client";

import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  Moon,
  Pencil,
  Plus,
  Sparkles,
  Sun,
  Trash2,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FriendlyNotice } from "@/components/onboarding/onboarding-ui";
import { Button } from "@/components/ui/button";
import { buildRoutineRationale } from "@/lib/onboarding/routine-rationale";
import {
  parseRoutineStep,
  routineStepIcon,
} from "@/lib/onboarding/parse-routine-step";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import { cn } from "@/lib/utils";

const STEP_CONCERN_IDS = [
  "acne",
  "dryness",
  "redness",
  "hyperpigmentation",
  "dullness",
  "large_pores",
] as const;

function PersonalizationChips({
  goalLabel,
  concernLabels,
  skinLabel,
}: {
  goalLabel: string;
  concernLabels: string[];
  skinLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
        {skinLabel}
      </span>
      <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
        {goalLabel}
      </span>
      {concernLabels.map((c) => (
        <span
          key={c}
          className="inline-flex items-center rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground"
        >
          {c}
        </span>
      ))}
    </div>
  );
}

function RoutineStepCard({
  stepText,
  index,
  period,
  editing,
}: {
  stepText: string;
  index: number;
  period: "morning" | "evening";
  editing: boolean;
}) {
  const t = useTranslations("onboarding");
  const ob = useOnboardingStore();
  const parsed = parseRoutineStep(stepText);
  const Icon = routineStepIcon(parsed.icon);
  const hasDetail = Boolean(parsed.detail && parsed.detail !== parsed.title);

  if (editing) {
    return (
      <li className="flex items-start gap-2 rounded-lg border border-border/80 bg-background p-2">
        <span className="mt-2.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
          {index + 1}
        </span>
        <textarea
          value={stepText}
          onChange={(e) => ob.updateRoutineStep(period, index, e.target.value)}
          rows={2}
          className="min-h-10 flex-1 rounded-md border bg-background px-2.5 py-2 text-sm outline-none ring-ring/40 focus:ring-2"
        />
        <div className="flex shrink-0 flex-col gap-0.5">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => ob.moveRoutineStep(period, index, -1)}
            className="inline-flex size-8 items-center justify-center rounded-md border hover:bg-muted disabled:opacity-30"
            aria-label={t("routineStep.moveUp")}
          >
            <ArrowUp className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={
              index >= (ob.starterRoutine?.[period].length ?? 1) - 1
            }
            onClick={() => ob.moveRoutineStep(period, index, 1)}
            className="inline-flex size-8 items-center justify-center rounded-md border hover:bg-muted disabled:opacity-30"
            aria-label={t("routineStep.moveDown")}
          >
            <ArrowDown className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={() => ob.removeRoutineStep(period, index)}
            className="inline-flex size-8 items-center justify-center rounded-md border text-destructive hover:bg-destructive/10"
            aria-label={t("routineStep.remove")}
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="rounded-xl border border-border/60 bg-background/80 p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            period === "morning"
              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
              : "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
          )}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {index + 1}
            </span>
            <p className="text-sm font-semibold leading-snug text-foreground">
              {parsed.title}
            </p>
          </div>
          {hasDetail ? (
            <details className="group text-sm">
              <summary className="flex cursor-pointer list-none items-center gap-1 text-xs font-medium text-primary hover:underline">
                <ChevronDown className="size-3.5 transition-transform group-open:rotate-180" />
                {t("step2.viewStepDetail")}
              </summary>
              <p className="mt-1.5 leading-relaxed text-muted-foreground">
                {parsed.detail}
              </p>
            </details>
          ) : (
            <p className="text-xs leading-relaxed text-muted-foreground">
              {stepText}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

function RoutinePeriodSection({
  period,
  steps,
  editing,
}: {
  period: "morning" | "evening";
  steps: string[];
  editing: boolean;
}) {
  const t = useTranslations("onboarding");
  const ob = useOnboardingStore();
  const isMorning = period === "morning";

  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border-2 p-4",
        isMorning
          ? "border-amber-500/35 bg-gradient-to-b from-amber-500/[0.08] to-transparent"
          : "border-indigo-500/35 bg-gradient-to-b from-indigo-500/[0.08] to-transparent",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-xl",
            isMorning ? "bg-amber-500/20" : "bg-indigo-500/20",
          )}
        >
          {isMorning ? (
            <Sun className="size-5 text-amber-600 dark:text-amber-400" aria-hidden />
          ) : (
            <Moon className="size-5 text-indigo-600 dark:text-indigo-400" aria-hidden />
          )}
        </span>
        <div>
          <h3 className="text-base font-bold">
            {isMorning ? t("routineStep.morning") : t("routineStep.evening")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isMorning ? t("step2.morningHint") : t("step2.eveningHint")}
          </p>
        </div>
        <span className="ml-auto rounded-full bg-background/80 px-2 py-0.5 text-xs font-semibold tabular-nums text-muted-foreground">
          {steps.length} {t("step2.stepCount")}
        </span>
      </div>

      <ol className="space-y-2.5">
        {steps.map((step, i) => (
          <RoutineStepCard
            key={`${period}-${i}-${step.slice(0, 12)}`}
            stepText={step}
            index={i}
            period={period}
            editing={editing}
          />
        ))}
      </ol>

      {editing && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={() => ob.addRoutineStep(period)}
        >
          <Plus className="size-4" aria-hidden />
          {t("routineStep.addStep")}
        </Button>
      )}
    </div>
  );
}

export function OnboardingStepStarterRoutine({
  editing,
  onToggleEditing,
}: {
  editing: boolean;
  onToggleEditing: () => void;
}) {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const routine = useOnboardingStore((s) => s.starterRoutine);
  const ob = useOnboardingStore();
  const [showUpdatedToast, setShowUpdatedToast] = useState(false);
  const wasEditingRef = useRef(false);
  const userEdited = useOnboardingStore((s) => s.starterRoutineUserEdited);

  const labelFn = useCallback(
    (key: string) => {
      try {
        return t(key as Parameters<typeof t>[0]);
      } catch {
        return key;
      }
    },
    [t],
  );

  const rationale = useMemo(
    () => (routine ? buildRoutineRationale(ob, locale, labelFn) : null),
    [routine, ob, locale, labelFn],
  );

  useEffect(() => {
    if (wasEditingRef.current && !editing && userEdited) {
      setShowUpdatedToast(true);
      const timer = window.setTimeout(() => setShowUpdatedToast(false), 3200);
      return () => window.clearTimeout(timer);
    }
    wasEditingRef.current = editing;
  }, [editing, userEdited]);

  if (!routine) {
    return (
      <FriendlyNotice variant="empty" title={t("step2.loadingTitle")}>
        {t("step2.loadingBody")}
      </FriendlyNotice>
    );
  }

  const concernLabels = (rationale?.concerns ?? ob.aiConcernTags).map((id) =>
    (STEP_CONCERN_IDS as readonly string[]).includes(id)
      ? t(`aiConcerns.${id as (typeof STEP_CONCERN_IDS)[number]}`)
      : id,
  );

  const skinLabel = rationale
    ? t(`skinType.${rationale.skinType as "combo"}`)
    : "—";
  const goalLabel = rationale
    ? t(`goal.${rationale.goal as "glow"}`)
    : "—";

  return (
    <section className="space-y-5" aria-labelledby="onb-routine-title">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles className="size-3.5" aria-hidden />
          {t("step2.personalBadge")}
        </div>
        <h2 id="onb-routine-title" className="text-xl font-bold leading-tight tracking-tight sm:text-2xl">
          {t("step2.title")}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("step2.subtitle")}</p>
      </div>

      <PersonalizationChips
        skinLabel={skinLabel}
        goalLabel={goalLabel}
        concernLabels={concernLabels.slice(0, 3)}
      />

      <div
        className={cn(
          "space-y-3 rounded-2xl border p-4",
          rationale?.source === "ai"
            ? "border-primary/30 bg-gradient-to-br from-primary/[0.07] via-background to-background"
            : "border-border/80 bg-muted/20",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">{t("step2.whyTitle")}</p>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              rationale?.source === "ai"
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground",
            )}
          >
            {rationale?.source === "ai" ? t("step2.sourceAi") : t("step2.sourceManual")}
          </span>
        </div>
        <div className="space-y-2">
          {(rationale?.lines ?? routine.rationale.split("\n")).map((line, i) => (
            <p key={i} className="text-sm leading-relaxed text-foreground/90">
              {line}
            </p>
          ))}
        </div>
      </div>

      {showUpdatedToast && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-3 text-sm font-medium text-emerald-800 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-2 dark:text-emerald-200"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          {t("step2.updatedToast")}
        </div>
      )}

      <div className="space-y-4">
        <RoutinePeriodSection period="morning" steps={routine.morning} editing={editing} />
        <RoutinePeriodSection period="evening" steps={routine.evening} editing={editing} />
      </div>

      {routine.week_notes ? (
        <p className="rounded-lg bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          {routine.week_notes}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant={editing ? "secondary" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={onToggleEditing}
        >
          <Pencil className="size-3.5" aria-hidden />
          {editing ? t("routineStep.doneEditing") : t("routineStep.editMore")}
        </Button>
        <p className="text-xs text-muted-foreground sm:text-right">{t("step2.editAnytime")}</p>
      </div>
    </section>
  );
}
