"use client";

import {
  ArrowRight,
  CalendarDays,
  Camera,
  Loader2,
  RefreshCw,
  Sparkles,
  Sun as SunIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { apiBaseUrl } from "@/lib/api";
import { authHeaders, getAccessToken } from "@/lib/auth-token";
import { cn } from "@/lib/utils";

/**
 * Latest check-in summary used by the Routine page so the user can see what
 * the AI's "today" recommendations are based on (skin tags + symptoms).
 *
 * Pulled from `GET /api/v1/progress?range=30&limit=1` — the same lean endpoint
 * the Progress page uses, so we don't add any new server work. Empty / signed-out
 * states render a soft CTA pointing back to /check-in.
 */
export function CheckInContextCard() {
  const t = useTranslations("routine.checkInContext");
  const tConditions = useTranslations("checkIn.conditions");
  const tSymptoms = useTranslations("checkIn.symptoms");

  const [entry, setEntry] = useState<ProgressEntry | null>(null);
  const [status, setStatus] = useState<
    "loading" | "ready" | "anon" | "empty" | "error"
  >("loading");

  const load = useCallback(async () => {
    if (!getAccessToken()) {
      setStatus("anon");
      return;
    }
    setStatus("loading");
    try {
      const res = await fetch(
        `${apiBaseUrl}/api/v1/progress?range=30&limit=1`,
        { headers: authHeaders() },
      );
      if (!res.ok) {
        setStatus("error");
        return;
      }
      const json = await res.json().catch(() => ({}));
      const list = (json?.data?.entries ?? []) as ProgressEntry[];
      const top = list[0];
      if (!top) {
        setEntry(null);
        setStatus("empty");
      } else {
        setEntry(top);
        setStatus("ready");
      }
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Hook-order safety: defined unconditionally so render branching below
  // doesn't change which hooks run between renders.
  const conditionLabel = useCallback(
    (raw: string): string => translateSafely(tConditions, raw),
    [tConditions],
  );
  const symptomLabel = useCallback(
    (raw: string): string => translateSafely(tSymptoms, raw),
    [tSymptoms],
  );

  if (status === "loading") {
    return (
      <Card className="border-dashed">
        <CardContent className="flex items-center gap-2 py-3 text-xs text-muted-foreground" role="status">
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          {t("loading")}
        </CardContent>
      </Card>
    );
  }

  if (status === "anon") {
    return null;
  }

  if (status === "error") {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-semibold text-destructive">{t("errorTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("errorHint")}</p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 self-start rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted sm:self-center"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            {t("retry")}
          </button>
        </CardContent>
      </Card>
    );
  }

  if (status === "empty") {
    return (
      <Card className="border-primary/25 bg-linear-to-br from-primary/5 to-transparent">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
              <Camera className="size-3.5" aria-hidden />
            </span>
            <div className="space-y-0.5">
              <p className="text-sm font-semibold leading-snug">
                {t("emptyTitle")}
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {t("emptyHint")}
              </p>
            </div>
          </div>
          <Link
            href="/check-in"
            className="inline-flex shrink-0 items-center gap-1 self-start rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 sm:self-center"
          >
            {t("emptyCta")}
            <ArrowRight className="size-3" aria-hidden />
          </Link>
        </CardContent>
      </Card>
    );
  }

  // status === "ready"
  const e = entry!;
  const tags = (e.tags ?? []).slice(0, 5);
  const symptoms = (e.symptoms ?? []).slice(0, 3);
  const dateLabel = formatRelativeDate(e.check_date, t);

  return (
    <Card className="border-primary/20 bg-linear-to-br from-primary/5 via-accent/15 to-background">
      <CardContent className="space-y-3 pt-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-0.5">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="size-3" aria-hidden />
              {t("title")}
            </p>
            <p className="text-sm leading-snug text-foreground">
              {t("subtitle")}
            </p>
          </div>
          <Link
            href="/check-in"
            className="inline-flex shrink-0 items-center gap-1 self-start rounded-full border border-primary/30 bg-background/80 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
          >
            {t("cta")}
            <ArrowRight className="size-3" aria-hidden />
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3" aria-hidden />
            <span>{dateLabel}</span>
          </span>
          {e.status && e.status !== "completed" ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider",
                e.status === "failed"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-amber-500/10 text-amber-700 dark:text-amber-200",
              )}
            >
              {translateSafely(t, `status.${e.status}`)}
            </span>
          ) : null}
          {e.gauges?.overall != null ? (
            <span className="inline-flex items-center gap-1">
              <SunIcon className="size-3" aria-hidden />
              <span className="tabular-nums">
                {t("overall", { pct: Math.round((e.gauges.overall ?? 0) * 100) })}
              </span>
            </span>
          ) : null}
        </div>

        {tags.length > 0 || symptoms.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={`c-${tag}`}
                className="rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[11px] font-medium text-primary"
              >
                {conditionLabel(tag)}
              </span>
            ))}
            {symptoms.map((s) => (
              <span
                key={`s-${s}`}
                className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-200"
              >
                {symptomLabel(s)}
              </span>
            ))}
          </div>
        ) : null}

        {e.snippet ? (
          <p className="rounded-lg bg-background/70 px-3 py-2 text-xs leading-relaxed text-foreground/90">
            {e.snippet}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

// ---- helpers ------------------------------------------------------------

type ProgressEntry = {
  id: string;
  check_date: string;
  status?: string;
  tags?: string[];
  symptoms?: string[];
  snippet?: string;
  gauges?: {
    overall?: number;
    hydration?: number;
    clarity?: number;
    barrier?: number;
  };
};

type TranslateFn = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

/**
 * Defensive translate: next-intl throws on missing keys when the
 * `MissingMessageError` strict mode is enabled. We'd rather show the raw tag
 * than crash the routine page, so we catch and fall back.
 */
function translateSafely(
  t: TranslateFn,
  key: string,
  values?: Record<string, string | number | Date>,
): string {
  try {
    return t(key, values);
  } catch {
    return key;
  }
}

function formatRelativeDate(iso: string, t: TranslateFn): string {
  if (!iso) return "";
  const parts = iso.split("-").map((p) => parseInt(p, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) return iso;
  const target = Date.UTC(parts[0], parts[1] - 1, parts[2]);
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffDays = Math.round((today - target) / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return t("today");
  if (diffDays === 1) return t("yesterday");
  if (diffDays < 7) return t("daysAgo", { n: diffDays });
  return iso;
}
