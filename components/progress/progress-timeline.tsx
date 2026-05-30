"use client";

import { AlertCircle, Camera, Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

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
import { ProgressEntryCard } from "./progress-entry-card";
import { ProgressSummaryCard } from "./progress-summary-card";
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

  const fetchTimeline = useCallback(
    async (r: ProgressRangeKey) => {
      setLoading(true);
      if (!data) setErrMsg(null);
      try {
        const headers: Record<string, string> = {};
        const token = getAccessToken();
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch(`${apiBaseUrl}/api/v1/progress?range=${r}`, { headers });
        const raw = await res.json().catch(() => ({}));
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
        setData(raw.data as ProgressTimelineDTO);
      } catch {
        setErrMsg(t("errors.networkError"));
        setData(null);
      } finally {
        setLoading(false);
      }
    },
    [t, data],
  );

  useEffect(() => {
    void fetchTimeline(range);
  }, [range, fetchTimeline]);

  // Oldest-→-newest sparkline points (entries arrive newest-first; reverse + filter).
  const sparklinePoints = useMemo<SparklinePoint[]>(() => {
    if (!data) return [];
    return [...data.entries]
      .filter((e) => e.gauges?.overall != null)
      .reverse()
      .map((e) => ({ date: e.check_date, value: e.gauges!.overall as number }));
  }, [data]);

  // Before-After candidate selection: most recent + first (oldest) completed entry
  // in the same range that ALSO has a photo. Falls back gracefully to null.
  const beforeAfter = useMemo(() => {
    if (!data || data.entries.length < 2) return null;
    const withPhoto = data.entries.filter((e) => (e.image_urls?.length ?? 0) > 0);
    if (withPhoto.length < 2) return null;
    return { after: withPhoto[0], before: withPhoto[withPhoto.length - 1] };
  }, [data]);

  return (
    <div className="space-y-6">
      <RangeChips active={range} onChange={setRange} busy={loading && Boolean(data)} />

      {loading && !data ? <TimelineSkeleton /> : null}

      {!loading && errMsg ? (
        <ErrorCard
          message={errMsg}
          onRetry={() => fetchTimeline(range)}
          retryLabel={t("retry")}
          loginLabel={t("errors.signIn")}
          showLogin={errMsg === t("errors.needAuth")}
        />
      ) : null}

      {!errMsg && data && data.entries.length === 0 && !loading ? <EmptyState /> : null}

      {!errMsg && data && data.entries.length > 0 ? (
        <div
          className={cn(
            "space-y-5 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500",
            loading && "pointer-events-none opacity-60",
          )}
        >
          <ProgressSummaryCard summary={data.summary} sparklinePoints={sparklinePoints} />

          {beforeAfter ? (
            <ProgressBeforeAfter before={beforeAfter.before} after={beforeAfter.after} />
          ) : null}

          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight">{t("entriesTitle")}</h3>
              <span className="text-xs text-muted-foreground">
                {t("entriesCount", { n: data.total })}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.entries.map((entry) => (
                <ProgressEntryCard key={entry.id} entry={entry} />
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

/** Motivational empty state nudging the user toward their first check-in. */
function EmptyState() {
  const t = useTranslations("progress.empty");
  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-accent/40 to-background">
      <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/20 blur-3xl" aria-hidden />
      <CardContent className="relative space-y-4 py-10 text-center sm:py-14">
        <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-background/80 shadow-sm ring-1 ring-primary/20">
          <Camera className="size-5 text-primary" aria-hidden />
        </span>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">{t("title")}</h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{t("body")}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <ButtonLink href="/check-in" size="default" className="gap-1.5">
            <Sparkles className="size-4" aria-hidden />
            {t("cta")}
          </ButtonLink>
        </div>
      </CardContent>
    </Card>
  );
}
