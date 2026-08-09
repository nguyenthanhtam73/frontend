"use client";

import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronRight,
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
import { starterCareNote } from "@/lib/onboarding/guest-starter";
import {
  parseRoutineStep,
  routineStepIcon,
} from "@/lib/onboarding/parse-routine-step";
import { buildRoutineRationale } from "@/lib/onboarding/routine-rationale";
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
      <span className="inline-flex min-h-7 items-center rounded-full border border-primary/30 bg-primary/8 px-2.5 py-0.5 text-xs font-semibold text-primary">
        {skinLabel}
      </span>
      <span className="inline-flex min-h-7 items-center rounded-full border border-emerald-500/30 bg-emerald-500/8 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
        {goalLabel}
      </span>
      {concernLabels.map((c) => (
        <span
          key={c}
          className="inline-flex min-h-7 items-center rounded-full border border-border/70 bg-muted/30 px-2.5 py-0.5 text-xs text-muted-foreground"
        >
          {c}
        </span>
      ))}
    </div>
  );
}

function EditActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  destructive,
}: {
  icon: typeof ArrowUp;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg border bg-background px-1 py-1.5 transition-colors active:scale-[0.98]",
        "disabled:opacity-35",
        destructive
          ? "border-destructive/30 text-destructive hover:bg-destructive/10"
          : "border-border hover:bg-muted/60",
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className="max-w-full truncate text-[10px] font-medium leading-none sm:text-[11px]">
        {label}
      </span>
    </button>
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
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const detailRef = useRef<HTMLParagraphElement>(null);
  const parsed = parseRoutineStep(stepText);
  const Icon = routineStepIcon(parsed.icon);
  const hasDetail = Boolean(parsed.detail && parsed.detail !== parsed.title);

  useEffect(() => {
    if (!hasDetail || expanded) return;
    const el = detailRef.current;
    if (!el) return;

    const measure = () => {
      setTruncated(el.scrollHeight > el.clientHeight + 1);
    };
    measure();

    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [hasDetail, expanded, parsed.detail]);

  if (editing) {
    return (
      <li
        className="space-y-2 rounded-lg border border-border/80 bg-background p-2.5"
        data-testid={`onboarding-starter-step-${period}-${index}`}
      >
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-bold",
              period === "morning"
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                : "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
            )}
          >
            {index + 1}
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            {t("step2.editStepLabel", { n: index + 1 })}
          </span>
        </div>
        <textarea
          value={stepText}
          onChange={(e) => ob.updateRoutineStep(period, index, e.target.value)}
          rows={2}
          data-testid={`onboarding-starter-input-${period}-${index}`}
          className="min-h-[4rem] w-full rounded-lg border bg-background px-3 py-2.5 text-sm outline-none ring-ring/40 focus:ring-2"
        />
        <div className="grid grid-cols-3 gap-1.5">
          <EditActionButton
            icon={ArrowUp}
            label={t("routineStep.moveUp")}
            disabled={index === 0}
            onClick={() => ob.moveRoutineStep(period, index, -1)}
          />
          <EditActionButton
            icon={ArrowDown}
            label={t("routineStep.moveDown")}
            disabled={index >= (ob.starterRoutine?.[period].length ?? 1) - 1}
            onClick={() => ob.moveRoutineStep(period, index, 1)}
          />
          <EditActionButton
            icon={Trash2}
            label={t("routineStep.remove")}
            destructive
            onClick={() => ob.removeRoutineStep(period, index)}
          />
        </div>
      </li>
    );
  }

  return (
    <li
      className="rounded-lg border border-border/60 bg-background/90 px-2.5 py-2.5"
      data-testid={`onboarding-starter-step-${period}-${index}`}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            period === "morning"
              ? "bg-amber-500/12 text-amber-600 dark:text-amber-400"
              : "bg-indigo-500/12 text-indigo-600 dark:text-indigo-400",
          )}
        >
          <Icon className="size-[1.125rem]" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[11px] font-bold tabular-nums text-muted-foreground">
              {index + 1}
            </span>
            <p
              className="text-sm font-semibold leading-snug text-foreground"
              data-testid={`onboarding-starter-text-${period}-${index}`}
            >
              {parsed.title}
            </p>
          </div>
          {hasDetail ? (
            <div className="mt-0.5">
              <p
                ref={detailRef}
                className={cn(
                  "text-xs leading-relaxed text-muted-foreground",
                  !expanded && "line-clamp-1 sm:line-clamp-2",
                )}
              >
                {parsed.detail}
              </p>
              {truncated || expanded ? (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-0.5 inline-flex items-center gap-0.5 text-[11px] font-medium text-primary"
                >
                  {expanded ? t("step2.hideDetail") : t("step2.viewStepDetail")}
                  <ChevronRight
                    className={cn("size-3 transition-transform", expanded && "rotate-90")}
                    aria-hidden
                  />
                </button>
              ) : null}
            </div>
          ) : (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">{stepText}</p>
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
        "overflow-hidden rounded-xl border shadow-sm",
        isMorning
          ? "border-amber-400/35 bg-gradient-to-b from-amber-500/[0.08] to-background"
          : "border-indigo-400/35 bg-gradient-to-b from-indigo-500/[0.08] to-background",
      )}
      data-testid={`onboarding-starter-${period}`}
    >
      <div
        className={cn(
          "flex items-center gap-2.5 border-b px-3 py-2.5",
          isMorning ? "border-amber-500/15 bg-amber-500/8" : "border-indigo-500/15 bg-indigo-500/8",
        )}
      >
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            isMorning ? "bg-amber-500 text-white" : "bg-indigo-600 text-white dark:bg-indigo-500",
          )}
        >
          {isMorning ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold tracking-tight sm:text-base">
            {isMorning ? t("routineStep.morning") : t("routineStep.evening")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isMorning ? t("step2.morningHint") : t("step2.eveningHint")}
          </p>
        </div>
        <div
          className={cn(
            "flex shrink-0 items-baseline gap-1 rounded-lg px-2.5 py-1",
            isMorning ? "bg-amber-500/15" : "bg-indigo-500/15",
          )}
        >
          <span
            className={cn(
              "text-xl font-bold tabular-nums leading-none",
              isMorning ? "text-amber-700 dark:text-amber-300" : "text-indigo-700 dark:text-indigo-300",
            )}
          >
            {steps.length}
          </span>
          <span className="text-[10px] font-semibold uppercase text-muted-foreground">
            {t("step2.stepCount")}
          </span>
        </div>
      </div>

      <div className="space-y-2 p-2.5 sm:p-3">
        <ol className="space-y-2">
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
            variant="outline"
            size="sm"
            className="h-11 w-full gap-1.5 text-xs"
            onClick={() => ob.addRoutineStep(period)}
          >
            <Plus className="size-4" aria-hidden />
            {t("routineStep.addStep")}
          </Button>
        )}
      </div>
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
  const aiSnapshot = useOnboardingStore((s) => s.aiSnapshot);
  const aiConcernTags = useOnboardingStore((s) => s.aiConcernTags);
  const goal = useOnboardingStore((s) => s.goal);
  const skinType = useOnboardingStore((s) => s.skinType);
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

  const rationale = useMemo(() => {
    if (!routine) return null;
    return buildRoutineRationale(
      { aiSnapshot, aiConcernTags, goal, skinType } as Parameters<
        typeof buildRoutineRationale
      >[0],
      locale,
      labelFn,
    );
  }, [routine, aiSnapshot, aiConcernTags, goal, skinType, locale, labelFn]);

  const concernLabels = useMemo(() => {
    const ids = rationale?.concerns ?? aiConcernTags;
    return ids.map((id) =>
      (STEP_CONCERN_IDS as readonly string[]).includes(id)
        ? t(`aiConcerns.${id as (typeof STEP_CONCERN_IDS)[number]}`)
        : id,
    );
  }, [rationale, aiConcernTags, t]);

  const goalLabel = useMemo(
    () => (rationale ? t(`goal.${rationale.goal as "glow"}`) : "—"),
    [rationale, t],
  );

  const careNote = useMemo(() => starterCareNote(goal, locale), [goal, locale]);

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

  const skinLabel = rationale ? t(`skinType.${rationale.skinType as "combo"}`) : "—";

  return (
    <section
      className="space-y-3.5 sm:space-y-4"
      aria-labelledby="onb-routine-title"
      data-testid="onboarding-step-starter-routine"
    >
      <div className="space-y-1.5">
        <div
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/30 px-2.5 py-1 text-[11px] font-bold text-foreground sm:text-xs"
          data-testid="onboarding-starter-personal-badge"
        >
          <Sparkles className="size-3.5 text-primary" aria-hidden />
          {t("step2.personalBadge")}
        </div>
        <h2
          id="onb-routine-title"
          className="text-lg font-bold leading-tight tracking-tight sm:text-2xl"
        >
          {t("step2.title")}
        </h2>
        <p className="text-sm leading-snug text-muted-foreground sm:text-[15px]">
          {t("step2.subtitle")}
        </p>
      </div>

      {/* One compact personalization line — avoid stacking readback + chips + rationale. */}
      <PersonalizationChips
        skinLabel={skinLabel}
        goalLabel={goalLabel}
        concernLabels={concernLabels.slice(0, 2)}
      />
      {rationale?.headline ? (
        <p className="text-xs leading-relaxed text-muted-foreground">
          {rationale.headline}
        </p>
      ) : null}
      {rationale?.lines?.length ? (
        <ul className="space-y-1">
          {rationale.lines.slice(0, 2).map((line) => (
            <li
              key={line}
              className="text-xs leading-relaxed text-foreground/85"
            >
              · {line}
            </li>
          ))}
        </ul>
      ) : null}

      {editing && (
        <p className="rounded-lg border border-dashed border-primary/30 bg-primary/[0.04] px-3 py-2 text-center text-xs font-medium text-primary">
          {t("step2.editingHint")}
        </p>
      )}

      {showUpdatedToast && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2.5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
        >
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
              {t("step2.updatedToast")}
            </p>
            <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80">
              {t("step2.updatedToastSub")}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        <RoutinePeriodSection period="morning" steps={routine.morning} editing={editing} />
        <RoutinePeriodSection period="evening" steps={routine.evening} editing={editing} />
      </div>

      {careNote ? (
        <p
          className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-xs leading-relaxed text-amber-950 dark:text-amber-100"
          data-testid="onboarding-care-note-no-pick"
        >
          {careNote}
        </p>
      ) : null}

      {routine.week_notes ? (
        <p className="whitespace-pre-wrap rounded-lg border border-border/50 bg-muted/25 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {routine.week_notes}
        </p>
      ) : null}

      <div className="space-y-1.5 pt-0.5">
        <Button
          type="button"
          variant={editing ? "default" : "outline"}
          size="lg"
          className="h-11 w-full gap-2 text-sm font-semibold sm:min-h-12"
          onClick={onToggleEditing}
          data-testid="onboarding-starter-edit-toggle"
        >
          <Pencil className="size-4" aria-hidden />
          {editing ? t("routineStep.doneEditing") : t("routineStep.editMore")}
        </Button>
        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          {t("step2.editAnytime")}
        </p>
      </div>
    </section>
  );
}
