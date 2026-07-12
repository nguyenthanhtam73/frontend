"use client";

import { Flame, Minus, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

import { Card, CardContent } from "@/components/ui/card";
import { FeedbackButtons } from "@/components/ui/feedback-buttons";
import { apiBaseUrl } from "@/lib/api";
import type {
  MonthlyComparisonDTO,
  ProgressSummaryDataDTO,
} from "@/lib/types/progress";

import {
  ProgressSparkline,
  type SparklinePoint,
} from "./progress-sparkline";

/** Hero card for the Progress page — combines the "this month vs last" headline,
 *  the streak counter, and a tiny overall-score sparkline. Pure presentational. */
export function ProgressSummaryCard({
  summary,
  sparklinePoints,
  onPointSelect,
}: {
  summary: ProgressSummaryDataDTO;
  /** Optional. Pass the per-entry "overall" gauge values (oldest → newest) so the
   *  card can plot a sparkline. If empty, the chart is hidden gracefully. */
  sparklinePoints: SparklinePoint[];
  /** Forwarded to the sparkline: clicking a point jumps to that timeline entry. */
  onPointSelect?: (entryId: string) => void;
}) {
  const t = useTranslations("progress.summary");
  void apiBaseUrl; // future use; placeholder to keep imports stable.
  const cmp = summary.comparison;
  const trend = cmp?.trend ?? "flat";

  // Headline copy is computed here (not from i18n parameters with sign) because
  // the wording flips with the trend label — much easier to read inline.
  const headlinePct = cmp?.headline_pct ?? null;
  const headline = (() => {
    if (headlinePct == null) return t("noComparisonYet");
    const sign = headlinePct > 0 ? "+" : "";
    if (trend === "up") return t("headlineUp", { pct: `${sign}${headlinePct}%` });
    if (trend === "down") return t("headlineDown", { pct: `${sign}${headlinePct}%` });
    return t("headlineFlat");
  })();

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-accent/40 to-background shadow-sm">
      <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/20 blur-3xl" aria-hidden />
      <CardContent className="relative space-y-4 pt-5 sm:pt-6">
        <div className="flex items-start gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-background/80 shadow-sm ring-1 ring-primary/20">
            <Sparkles className="size-4 text-primary" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              {t("sectionLabel")}
            </p>
            <h2 className="text-lg font-semibold leading-tight tracking-tight sm:text-xl">
              {headline}
            </h2>
            {summary.current_month ? (
              <p className="text-xs text-muted-foreground sm:text-sm">
                {t("checksThisMonth", { n: summary.current_month.checks_count })}
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <StatTile
            icon={<Flame className="size-3.5" aria-hidden />}
            label={t("streak")}
            value={String(summary.streak_days)}
            suffix={t("daysSuffix")}
          />
          <StatTile
            icon={<TrendIcon trend={trend} />}
            label={t("overall")}
            value={pctOrDash(summary.current_month?.overall_avg)}
          />
          <StatTile
            icon={<Sparkles className="size-3.5" aria-hidden />}
            label={t("total")}
            value={String(summary.total_checks)}
          />
        </div>

        {sparklinePoints.length >= 2 ? (
          <div className="space-y-1.5 rounded-xl bg-background/60 p-3 shadow-sm ring-1 ring-border/60">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>{t("sparklineLabel")}</span>
              <span className="tabular-nums">{sparklinePoints.length} pts</span>
            </div>
            <ProgressSparkline
              points={sparklinePoints}
              height={48}
              ariaLabel={t("sparklineLabel")}
              onPointSelect={onPointSelect}
            />
          </div>
        ) : null}

        {cmp ? <GaugeDeltaGrid cmp={cmp} /> : null}

        {/* Feedback loop on the progress summary — lets us learn whether the
            "this month vs last" framing actually feels useful to the user.
            Renders as a compact inline footer so it doesn't compete with the
            hero copy above. */}
        {summary.feedback_target_id ? (
          <FeedbackButtons
            targetType="progress_summary"
            targetId={summary.feedback_target_id}
            compact
            size="xs"
            className="pt-1"
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Compact "key stat" tile used in the 3-column header grid. */
function StatTile({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="rounded-lg bg-background/70 px-2.5 py-2 shadow-sm ring-1 ring-border/60">
      <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        <span className="text-primary/80">{icon}</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className="text-base font-semibold tabular-nums sm:text-lg">{value}</span>
        {suffix ? <span className="text-[10px] text-muted-foreground">{suffix}</span> : null}
      </div>
    </div>
  );
}

/** Renders the 4 small gauge deltas (overall / hydration / clarity / barrier). */
function GaugeDeltaGrid({ cmp }: { cmp: MonthlyComparisonDTO }) {
  const t = useTranslations("progress.summary");
  const items = [
    { key: "overall", label: t("gaugeOverall"), delta: cmp.overall_delta },
    { key: "hydration", label: t("gaugeHydration"), delta: cmp.hydration_delta },
    { key: "clarity", label: t("gaugeClarity"), delta: cmp.clarity_delta },
    { key: "barrier", label: t("gaugeBarrier"), delta: cmp.barrier_delta },
  ] as const;
  const visible = items.filter((it) => it.delta != null);
  if (visible.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {visible.map((it) => (
        <DeltaChip key={it.key} label={it.label} delta={it.delta ?? 0} />
      ))}
    </div>
  );
}

function DeltaChip({ label, delta }: { label: string; delta: number }) {
  const trend: "up" | "flat" | "down" =
    delta > 0.03 ? "up" : delta < -0.03 ? "down" : "flat";
  const sign = delta > 0 ? "+" : "";
  const display = `${sign}${Math.round(delta * 100)}`;
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/70 px-2.5 py-1.5">
      <span className="truncate text-[11px] text-muted-foreground">{label}</span>
      <span
        className={`inline-flex items-center gap-1 text-xs font-semibold tabular-nums ${trendColorClass(trend)}`}
      >
        <TrendIcon trend={trend} />
        {display}
      </span>
    </div>
  );
}

function TrendIcon({ trend }: { trend: "up" | "flat" | "down" }) {
  const cls = "size-3.5";
  if (trend === "up") return <TrendingUp className={cls} aria-hidden />;
  if (trend === "down") return <TrendingDown className={cls} aria-hidden />;
  return <Minus className={cls} aria-hidden />;
}

function trendColorClass(trend: "up" | "flat" | "down") {
  if (trend === "up") return "text-emerald-600 dark:text-emerald-300";
  if (trend === "down") return "text-amber-600 dark:text-amber-300";
  return "text-muted-foreground";
}

function pctOrDash(v?: number) {
  if (v == null) return "—";
  return `${Math.round(v * 100)}%`;
}
