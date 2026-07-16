"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiBaseUrl } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-envelope";
import { getAccessToken } from "@/lib/auth-token";
import type {
  ProgressRangeKey,
  ProgressTimelineDTO,
} from "@/lib/types/progress";
import { cn } from "@/lib/utils";

import { ProgressBeforeAfter } from "./progress-before-after";
import { ProgressEmptyState } from "./progress-empty-state";
import { ProgressEntryCard } from "./progress-entry-card";
import { ProgressStreakCard } from "./progress-streak-card";
import { ProgressSummaryCard } from "./progress-summary-card";
import { StreakMilestoneHost } from "./streak-milestone-celebration";
import type { SparklinePoint } from "./progress-sparkline";

const rangeOptions: ProgressRangeKey[] = ["30", "90", "180", "all"];

/** ProgressTimeline — client-only orchestrator for /progress.
 *
 *  Responsibilities:
 *    - Manage active range filter (`30 | 90 | 180 | all`) — re-fetches on change.
 *    - Fetch from GET /api/v1/progress?range=...
 *    - Handle 4 distinct states: loading / error / empty / data.
 *    - Compose summary hero + Before-After + per-entry timeline list. */
export function ProgressTimeline() {
  const t = useTranslations("progress");
  const [range, setRange] = useState<ProgressRangeKey>("30");
  const [data, setData] = useState<ProgressTimelineDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  // Whether the user has EVER checked in (any time), used to pick the right empty
  // state. `null` = not yet determined. A single ranged query can't tell a brand
  // new user apart from an empty range, so we resolve this via an all-time probe.
  const [everCheckedIn, setEverCheckedIn] = useState<boolean | null>(null);

  const authHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {};
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, []);

  // Cheap all-time probe: hits the summary endpoint (no entries payload) purely to
  // learn whether any check-in exists at all. Only called when a ranged view came
  // back empty and the range isn't already "all".
  const probeEverCheckedIn = useCallback(
    async (isStale?: () => boolean) => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/progress/summary?range=all`, {
          headers: authHeaders(),
        });
        const raw = await res.json().catch(() => ({}));
        if (isStale?.()) return;
        const total = raw?.data?.summary?.total_checks ?? 0;
        setEverCheckedIn(total > 0);
      } catch {
        // On failure, default to the encouraging first-time copy.
        if (!isStale?.()) setEverCheckedIn(false);
      }
    },
    [authHeaders],
  );

  const loadTimeline = useCallback(
    async (r: ProgressRangeKey, isStale?: () => boolean) => {
      setLoading(true);
      setErrMsg(null);
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/progress?range=${r}`, {
          headers: authHeaders(),
        });
        const raw = await res.json().catch(() => ({}));
        if (isStale?.()) return;
        if (res.status === 401) {
          setErrMsg(t("errors.needAuth"));
          setData(null);
          return;
        }
        if (!res.ok || !raw?.success) {
          setErrMsg(getApiErrorMessage(raw, t("errors.fetchFail")));
          setData(null);
          return;
        }
        const timeline = raw.data as ProgressTimelineDTO;
        setData(timeline);
        // Resolve which empty state to show (only matters when this range is empty).
        if (timeline.entries.length > 0) {
          setEverCheckedIn(true);
        } else if (r === "all") {
          setEverCheckedIn(false); // empty across all time = genuinely never
        } else {
          void probeEverCheckedIn(isStale);
        }
      } catch {
        if (!isStale?.()) {
          setErrMsg(t("errors.networkError"));
          setData(null);
        }
      } finally {
        if (!isStale?.()) setLoading(false);
      }
    },
    [t, authHeaders, probeEverCheckedIn],
  );

  useEffect(() => {
    let cancelled = false;
    void loadTimeline(range, () => cancelled);
    return () => {
      cancelled = true;
    };
  }, [range, loadTimeline]);

  // Oldest-→-newest sparkline points (entries arrive newest-first; reverse + filter).
  // We tag each point with its entry id so a sparkline click can jump to the row.
  const sparklinePoints = useMemo<SparklinePoint[]>(() => {
    if (!data) return [];
    return [...data.entries]
      .filter((e) => e.gauges?.overall != null)
      .reverse()
      .map((e) => ({ date: e.check_date, value: e.gauges!.overall as number, entryId: e.id }));
  }, [data]);

  // Check-in days from the loaded timeline — supplemental for mini history.
  // Streak reconstruct is always the baseline; this set only fills gaps.
  const checkedDates = useMemo(() => {
    if (!data?.entries.length) return undefined;
    return new Set(data.entries.map((e) => e.check_date));
  }, [data]);

  // Which entry card is currently highlighted (after a sparkline click). The
  // timeout ref lets us cancel a pending clear if the user clicks again quickly.
  const [highlightedEntryId, setHighlightedEntryId] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Clear any pending highlight timer on unmount.
    return () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    };
  }, []);

  // Sparkline click → smooth-scroll to the matching entry card and pulse a ring on
  // it for ~2.5s. We locate the card by its stable DOM id (set in ProgressEntryCard).
  const focusEntry = useCallback((entryId: string) => {
    const el = document.getElementById(`progress-entry-${entryId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedEntryId(entryId);
    if (highlightTimer.current) clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightedEntryId(null), 2500);
  }, []);

  return (
    <div className="space-y-6">
      <StreakMilestoneHost />

      {/* Streak lives above the range filter so it stays visible even on empty ranges. */}
      <ProgressStreakCard checkedDates={checkedDates} historyDays={7} />

      <RangeChips active={range} onChange={setRange} busy={loading && Boolean(data)} />

      {loading && !data ? <TimelineSkeleton /> : null}

      {!loading && errMsg ? (
        <ErrorCard
          message={errMsg}
          onRetry={() => loadTimeline(range)}
          retryLabel={t("retry")}
          loginLabel={t("errors.signIn")}
          showLogin={errMsg === t("errors.needAuth")}
        />
      ) : null}

      {!errMsg && data && data.entries.length === 0 && !loading ? (
        // Distinguish a brand-new user ("first") from an empty range ("range").
        // While the all-time probe is pending (everCheckedIn === null) we show the
        // encouraging first-time copy; it upgrades to "range" once history is found.
        <ProgressEmptyState
          mode={everCheckedIn ? "range" : "first"}
          onViewAll={() => setRange("all")}
        />
      ) : null}

      {!errMsg && data && data.entries.length > 0 ? (
        <div
          className={cn(
            "space-y-5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500",
            loading && "pointer-events-none opacity-60",
          )}
        >
          <ProgressSummaryCard
            summary={data.summary}
            sparklinePoints={sparklinePoints}
            onPointSelect={focusEntry}
          />

          <ProgressBeforeAfter entries={data.entries} range={range} />

          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight">{t("entriesTitle")}</h3>
              <span className="text-xs text-muted-foreground">
                {t("entriesCount", { n: data.total })}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.entries.map((entry) => (
                <ProgressEntryCard
                  key={entry.id}
                  entry={entry}
                  highlighted={entry.id === highlightedEntryId}
                />
              ))}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

/** Range filter chip row — 30 days / 90 days / 180 days / all. */
function RangeChips({
  active,
  onChange,
  busy = false,
}: {
  active: ProgressRangeKey;
  onChange: (r: ProgressRangeKey) => void;
  busy?: boolean;
}) {
  const t = useTranslations("progress.range");
  const tProgress = useTranslations("progress");
  // Use radiogroup semantics — these chips behave like single-select filters
  // without tab panels, which is the actual interaction model.
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        className="flex flex-wrap gap-1.5"
        role="radiogroup"
        aria-label={tProgress("rangeAriaLabel")}
      >
        {rangeOptions.map((opt) => (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={opt === active}
            disabled={busy}
            onClick={() => onChange(opt)}
            className={cn(
              "min-h-9 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors",
              opt === active
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
              busy && "opacity-70",
            )}
          >
            {t(opt)}
          </button>
        ))}
      </div>
      {busy ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
      ) : null}
    </div>
  );
}

function TimelineSkeleton() {
  return (
    <div className="space-y-5" aria-hidden>
      <Skeleton className="h-36 w-full rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function ErrorCard({
  message,
  onRetry,
  retryLabel,
  loginLabel,
  showLogin,
}: {
  message: string;
  onRetry: () => void;
  retryLabel: string;
  loginLabel?: string;
  showLogin?: boolean;
}) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-center gap-2 font-medium text-destructive" role="alert">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {message}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
          {showLogin && loginLabel ? (
            <ButtonLink href="/login" variant="default" size="sm">
              {loginLabel}
            </ButtonLink>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

