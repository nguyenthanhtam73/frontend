"use client";

import { Check, Lock, Trophy } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";

import { UpsellBanner } from "@/components/premium/upsell-banner";
import { Button } from "@/components/ui/button";
import { useStreak } from "@/lib/hooks/use-streak";
import { Feature } from "@/lib/premium/features";
import { useFeatureGate } from "@/lib/premium/use-feature-gate";
import {
  BASIC_MILESTONE_DAYS,
  milestonesForPlan,
  premiumOnlyMilestones,
  STREAK_MILESTONES,
  type StreakMilestone,
} from "@/lib/streak/milestones";
import { cn } from "@/lib/utils";

type ProgressMilestonesCardProps = {
  className?: string;
};

/**
 * Streak milestone list on Progress.
 * Free sees basic (3 + 7); "View full list" unlocks Premium catalog or UpsellBanner.
 */
export function ProgressMilestonesCard({ className }: ProgressMilestonesCardProps) {
  const t = useTranslations("progress.streak.milestone");
  const gate = useFeatureGate(Feature.MilestoneFull);
  const { data: streak } = useStreak();
  const current = streak?.current_streak ?? 0;

  const [expanded, setExpanded] = useState(false);
  const [showUpsell, setShowUpsell] = useState(false);

  const fullAccess = !gate.locked && gate.allowed;
  const showingFull = fullAccess && expanded;

  const visible = useMemo(
    () => (showingFull ? STREAK_MILESTONES : milestonesForPlan(false)),
    [showingFull],
  );

  const lockedCount = premiumOnlyMilestones().length;

  const onViewFull = useCallback(() => {
    if (gate.isLoading) return;
    if (gate.locked) {
      setShowUpsell(true);
      requestAnimationFrame(() => {
        document.getElementById("upsell-milestone-full")?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      });
      return;
    }
    setShowUpsell(false);
    setExpanded(true);
  }, [gate.isLoading, gate.locked]);

  const onCollapse = useCallback(() => {
    setExpanded(false);
    setShowUpsell(false);
  }, []);

  return (
    <section
      className={cn(
        "space-y-3 rounded-2xl border border-border/80 bg-muted/25 p-4 sm:p-5",
        className,
      )}
      aria-label={t("list.ariaLabel")}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-800 dark:text-amber-200">
              <Trophy className="size-4" aria-hidden />
            </span>
            <h3 className="text-sm font-semibold tracking-tight">{t("list.title")}</h3>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
            {t("list.sub")}
          </p>
        </div>

        {!showingFull ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-h-9 gap-1.5 shrink-0"
            disabled={gate.isLoading}
            title={gate.locked ? t("list.lockedHint") : t("list.viewFull")}
            onClick={onViewFull}
          >
            {gate.locked ? <Lock className="size-3.5 opacity-70" aria-hidden /> : null}
            {t("list.viewFull")}
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="min-h-9 shrink-0"
            onClick={onCollapse}
          >
            {t("list.showBasic")}
          </Button>
        )}
      </div>

      <ul className="space-y-1.5" aria-label={t("list.ariaLabel")}>
        {visible.map((m) => (
          <MilestoneRow key={m.days} milestone={m} current={current} locked={false} />
        ))}
        {!showingFull && gate.locked
          ? premiumOnlyMilestones().slice(0, 2).map((m) => (
              <MilestoneRow key={`teaser-${m.days}`} milestone={m} current={current} locked />
            ))
          : null}
      </ul>

      {!showingFull && gate.locked && lockedCount > 0 ? (
        <p className="text-[11px] text-muted-foreground">
          {t("list.remaining", { n: lockedCount })}
        </p>
      ) : null}

      {showUpsell && gate.locked ? (
        <UpsellBanner
          id="upsell-milestone-full"
          feature={Feature.MilestoneFull}
          hideWhenAllowed={false}
          compact
          onDismiss={() => setShowUpsell(false)}
        />
      ) : null}
    </section>
  );
}

function MilestoneRow({
  milestone,
  current,
  locked,
}: {
  milestone: StreakMilestone;
  current: number;
  locked: boolean;
}) {
  const t = useTranslations("progress.streak.milestone");
  const reached = !locked && current >= milestone.days;
  const title = t(`items.${milestone.copyKey}.title`);
  const isBasic = BASIC_MILESTONE_DAYS.has(milestone.days);

  return (
    <li
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3 py-2.5",
        locked
          ? "border-dashed border-border/70 bg-background/40 opacity-80"
          : reached
            ? "border-emerald-500/30 bg-emerald-500/8"
            : "border-border/60 bg-background/70",
      )}
    >
      <span
        className={cn(
          "inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums",
          locked
            ? "bg-muted text-muted-foreground"
            : reached
              ? "bg-emerald-500/20 text-emerald-800 dark:text-emerald-100"
              : "bg-muted/80 text-muted-foreground",
        )}
        aria-hidden
      >
        {locked ? (
          <Lock className="size-3.5" />
        ) : reached ? (
          <Check className="size-3.5" strokeWidth={3} />
        ) : (
          milestone.days
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium leading-snug">
          {t("badge", { n: milestone.days })}
          {!isBasic && locked ? (
            <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              {t("list.premiumBadge")}
            </span>
          ) : null}
        </p>
        <p className="truncate text-xs text-muted-foreground">{title}</p>
      </div>
      {!locked && reached ? (
        <span className="shrink-0 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
          {t("list.reached")}
        </span>
      ) : null}
    </li>
  );
}
