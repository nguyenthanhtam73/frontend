"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
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

type BenefitVariant = "barrier" | "acne" | "glow" | "anti_aging" | "default";
type SkillMode = "beginner" | "intermediate" | "advanced";

type OnboardingT = ReturnType<typeof useTranslations<"onboarding">>;

function resolveSkillMode(skillMode: string | null): SkillMode {
  if (skillMode === "intermediate" || skillMode === "advanced") return skillMode;
  return "beginner";
}

function resolveBenefitVariant(
  goal: string | null,
  concerns: string[],
  barrierSignal?: string,
): BenefitVariant {
  if (
    goal === "barrier" ||
    concerns.includes("redness") ||
    concerns.includes("dryness") ||
    barrierSignal === "possibly_compromised"
  ) {
    return "barrier";
  }
  if (goal === "clear_acne" || concerns.includes("acne")) return "acne";
  if (goal === "anti_aging") return "anti_aging";
  if (goal === "glow") return "glow";
  return "default";
}

function getQuickWinMessage(
  t: OnboardingT,
  isAi: boolean,
  variant: BenefitVariant,
): string {
  const branch = isAi ? "ai" : "manual";
  try {
    return t(`step2.quickWin.${branch}.${variant}` as `step2.quickWin.ai.barrier`);
  } catch {
    return t("step2.quickWinLine");
  }
}

function getPersonalizedRationaleHeadline(
  t: OnboardingT,
  isAi: boolean,
  variant: BenefitVariant,
  goalLabel: string,
  concernLabels: string[],
  skillMode: SkillMode,
): string {
  const branch = isAi ? "ai" : "manual";
  const concerns =
    concernLabels.length > 0
      ? concernLabels.slice(0, 2).join(", ")
      : t("step2.concernsFallback");
  const skillLabel = t(`skill.${skillMode}.short` as `skill.beginner.short`);

  try {
    return t(
      `step2.rationaleHeadline.${branch}.${variant}` as `step2.rationaleHeadline.manual.acne`,
      { goal: goalLabel, concerns, skill: skillLabel },
    );
  } catch {
    return t("step2.rationaleHeadlineFallback", {
      goal: goalLabel,
      concerns,
      skill: skillLabel,
    });
  }
}

/** Benefit-oriented bullets — UI layer only, rationale generator unchanged. */
function getBenefitBullets(
  t: OnboardingT,
  isAi: boolean,
  variant: BenefitVariant,
  skillMode: SkillMode,
): string[] {
  const branch = isAi ? "ai" : "manual";
  const b0Key = variant === "default" ? "b0_default" : `b0_${variant}`;
  try {
    return [
      t(`step2.benefits.${branch}.${b0Key}` as `step2.benefits.ai.b0_barrier`),
      t(`step2.benefits.${branch}.b1` as `step2.benefits.ai.b1`),
      t(
        `step2.benefits.${branch}.b_skill.${skillMode}` as `step2.benefits.ai.b_skill.beginner`,
      ),
    ];
  } catch {
    return [];
  }
}

function trimToWords(text: string, maxWords = 14): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text.trim();
  return `${words.slice(0, maxWords).join(" ")}…`;
}

function QuickWinBanner({
  message,
  isAi,
  label,
}: {
  message: string;
  isAi: boolean;
  label: string;
}) {
  return (
    <div
      className={cn(
        "relative flex items-start gap-3 overflow-hidden rounded-xl border-2 px-3.5 py-3 shadow-sm",
        isAi
          ? "border-primary/40 bg-gradient-to-br from-primary/[0.12] via-primary/[0.06] to-emerald-500/[0.05]"
          : "border-emerald-500/40 bg-gradient-to-br from-emerald-500/[0.12] to-emerald-500/[0.04]",
      )}
      role="note"
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-xl shadow-sm",
          isAi
            ? "bg-primary text-primary-foreground"
            : "bg-emerald-600 text-white dark:bg-emerald-500",
        )}
      >
        <Sparkles className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p
          className={cn(
            "text-[10px] font-bold uppercase tracking-wide",
            isAi ? "text-primary/80" : "text-emerald-700/80 dark:text-emerald-300/80",
          )}
        >
          {label}
        </p>
        <p className="text-[13px] font-semibold leading-snug text-foreground sm:text-sm">
          {message}
        </p>
      </div>
    </div>
  );
}

function PersonalizationChips({
  goalLabel,
  concernLabels,
  skinLabel,
  skillLabel,
}: {
  goalLabel: string;
  concernLabels: string[];
  skinLabel: string;
  skillLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="inline-flex min-h-7 items-center rounded-full border border-primary/30 bg-primary/8 px-2.5 py-0.5 text-xs font-semibold text-primary">
        {skinLabel}
      </span>
      <span className="inline-flex min-h-7 items-center rounded-full border border-emerald-500/30 bg-emerald-500/8 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
        {goalLabel}
      </span>
      <span className="inline-flex min-h-7 items-center rounded-full border border-violet-500/30 bg-violet-500/8 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-300">
        {skillLabel}
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
  const parsed = parseRoutineStep(stepText);
  const Icon = routineStepIcon(parsed.icon);
  const hasDetail = Boolean(parsed.detail && parsed.detail !== parsed.title);

  if (editing) {
    return (
      <li className="space-y-2 rounded-lg border border-border/80 bg-background p-2.5">
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
    <li className="rounded-lg border border-border/60 bg-background/90 px-2.5 py-2.5">
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
            <p className="text-sm font-semibold leading-snug text-foreground">{parsed.title}</p>
          </div>
          {hasDetail ? (
            <div className="mt-0.5">
              {expanded ? (
                <p className="text-xs leading-relaxed text-muted-foreground">{parsed.detail}</p>
              ) : (
                <p className="line-clamp-1 text-xs leading-relaxed text-muted-foreground sm:line-clamp-2">
                  {parsed.detail}
                </p>
              )}
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

function RationaleBlock({
  headline,
  benefitLines,
  source,
}: {
  headline: string;
  benefitLines: string[];
  source: "ai" | "manual";
}) {
  const t = useTranslations("onboarding");
  const isAi = source === "ai";
  const bullets = benefitLines.length > 0 ? benefitLines : [];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border",
        isAi
          ? "border-primary/25 bg-gradient-to-br from-primary/[0.05] to-background"
          : "border-border/80 bg-muted/20",
      )}
    >
      <div className="space-y-2.5 p-3 sm:p-3.5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-xs font-bold text-foreground sm:text-sm">{t("step2.whyTitle")}</h3>
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
              isAi ? "bg-primary/12 text-primary" : "bg-muted text-muted-foreground",
            )}
          >
            {isAi ? <Sparkles className="size-2.5" aria-hidden /> : null}
            {isAi ? t("step2.sourceAi") : t("step2.sourceManual")}
          </span>
        </div>

        <p className="text-[13px] font-semibold leading-snug text-foreground sm:text-sm">
          {trimToWords(headline, 22)}
        </p>

        {bullets.length > 0 ? (
          <ul className="space-y-1.5">
            {bullets.map((line, i) => (
              <li
                key={i}
                className="flex gap-2 text-[13px] leading-snug text-foreground/90 sm:leading-relaxed"
              >
                <Check
                  className={cn(
                    "mt-0.5 size-3.5 shrink-0",
                    isAi ? "text-primary" : "text-emerald-600 dark:text-emerald-400",
                  )}
                  aria-hidden
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        ) : null}
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
  const skillMode = useOnboardingStore((s) => s.skillMode);
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

  const benefitVariant = useMemo(
    () =>
      resolveBenefitVariant(
        goal,
        aiConcernTags,
        aiSnapshot?.barrier_signal,
      ),
    [goal, aiConcernTags, aiSnapshot?.barrier_signal],
  );

  const isAi = rationale?.source === "ai";

  const quickWinMessage = useMemo(
    () => getQuickWinMessage(t, isAi, benefitVariant),
    [t, isAi, benefitVariant],
  );

  const resolvedSkill = resolveSkillMode(skillMode);

  const benefitBullets = useMemo(
    () => getBenefitBullets(t, isAi, benefitVariant, resolvedSkill),
    [t, isAi, benefitVariant, resolvedSkill],
  );

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

  const personalizedHeadline = useMemo(
    () =>
      getPersonalizedRationaleHeadline(
        t,
        isAi,
        benefitVariant,
        goalLabel === "—" ? t("goal.unsure") : goalLabel,
        concernLabels,
        resolvedSkill,
      ),
    [t, isAi, benefitVariant, goalLabel, concernLabels, resolvedSkill],
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

  const skinLabel = rationale ? t(`skinType.${rationale.skinType as "combo"}`) : "—";
  const skillLabel = t(`skill.${resolvedSkill}.short` as `skill.beginner.short`);

  return (
    <section className="space-y-3.5 sm:space-y-4" aria-labelledby="onb-routine-title">
      <div className="space-y-1.5">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-2.5 py-1 text-[11px] font-bold text-primary sm:text-xs">
          <Sparkles className="size-3.5" aria-hidden />
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

      <QuickWinBanner message={quickWinMessage} isAi={isAi} label={t("step2.quickWinLabel")} />

      <PersonalizationChips
        skinLabel={skinLabel}
        goalLabel={goalLabel}
        skillLabel={skillLabel}
        concernLabels={concernLabels.slice(0, 3)}
      />

      {rationale && (
        <RationaleBlock
          headline={personalizedHeadline}
          benefitLines={benefitBullets}
          source={rationale.source}
        />
      )}

      {editing && (
        <p className="rounded-lg border border-dashed border-primary/30 bg-primary/[0.04] px-3 py-2 text-center text-xs font-medium text-primary">
          {t("step2.editingHint")}
        </p>
      )}

      {showUpdatedToast && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-start gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2.5 shadow-sm motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
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

      {routine.week_notes ? (
        <p className="rounded-lg border border-border/50 bg-muted/25 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
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
