"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import {
  adminRetentionLoadError,
  formatRetentionAsOf,
  formatRetentionPercent,
  retentionDateRangeIssue,
  retentionShareRows,
  type RetentionShareRow,
} from "@/lib/admin/retention-stats";
import {
  adminRetentionStatsQueryKey,
  fetchAdminRetentionStats,
} from "@/lib/api/admin-retention";
import { useAdminGate } from "@/lib/hooks/use-admin-gate";
import type {
  AdminRetentionSignupWeek,
  AdminRetentionStats,
} from "@/lib/types/admin-retention";
import { cn } from "@/lib/utils";

const inputClass =
  "min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function RetentionAdminView() {
  const t = useTranslations("adminRetention");
  const tUsers = useTranslations("adminUsers");
  const locale = useLocale();
  const { hasAuth, isAdmin, authPending } = useAdminGate();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const rangeIssue = retentionDateRangeIssue(from, to);

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: adminRetentionStatsQueryKey(from, to),
    queryFn: () => fetchAdminRetentionStats(from, to),
    enabled: !authPending && hasAuth && isAdmin && rangeIssue === null,
    retry: false,
    refetchInterval: 60_000,
  });

  if (authPending) {
    return (
      <Card className="border-border/70">
        <CardContent className="space-y-3 p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {tUsers("authLoading")}
          </div>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!hasAuth) {
    return (
      <Card className="border-dashed border-primary/25">
        <CardContent className="flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-muted-foreground">{tUsers("needAuth")}</p>
          <Link href="/login" className={cn(buttonVariants({ size: "sm" }))}>
            {tUsers("signIn")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-start gap-3 p-6 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p role="alert">{tUsers("forbidden")}</p>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    const kind = adminRetentionLoadError(error);
    if (kind === "auth") {
      return (
        <Card className="border-dashed border-primary/25">
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <p className="text-sm text-muted-foreground">{tUsers("needAuth")}</p>
            <Link href="/login" className={cn(buttonVariants({ size: "sm" }))}>
              {tUsers("signIn")}
            </Link>
          </CardContent>
        </Card>
      );
    }
    if (kind === "not_found") {
      return (
        <Card className="border-border/70">
          <CardContent className="p-6">
            <p role="status" className="text-sm text-muted-foreground">
              {t("notReady")}
            </p>
          </CardContent>
        </Card>
      );
    }
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-start gap-3 p-6 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p role="alert">{kind === "forbidden" ? tUsers("forbidden") : t("loadError")}</p>
        </CardContent>
      </Card>
    );
  }

  const registered = data?.registered_users ?? 0;
  const checkedIn = data?.users_with_checkin ?? 0;
  const dayRows = data ? retentionShareRows(data.days_used, registered, checkedIn) : [];
  const streakRows = data ? retentionShareRows(data.consecutive, registered, checkedIn) : [];
  const weeks = data?.by_signup_week ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
          <span>{t("fromLabel")}</span>
          <input
            type="date"
            className={inputClass}
            value={from}
            max={to || undefined}
            onChange={(event) => setFrom(event.target.value)}
          />
        </label>
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
          <span>{t("toLabel")}</span>
          <input
            type="date"
            className={inputClass}
            value={to}
            min={from || undefined}
            onChange={(event) => setTo(event.target.value)}
          />
        </label>
        {from || to ? (
          <button
            type="button"
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            onClick={() => {
              setFrom("");
              setTo("");
            }}
          >
            {t("clearRange")}
          </button>
        ) : null}
        {isFetching ? (
          <Loader2 className="mb-2 size-4 animate-spin text-muted-foreground" aria-hidden />
        ) : null}
      </div>

      {rangeIssue === "order" ? (
        <p role="alert" className="text-sm text-destructive">
          {t("rangeOrder")}
        </p>
      ) : (
        <RetentionStats
          data={data}
          isLoading={isLoading}
          locale={locale}
          registered={registered}
          checkedIn={checkedIn}
          dayRows={dayRows}
          streakRows={streakRows}
          weeks={weeks}
        />
      )}
    </div>
  );
}

function RetentionStats({
  data,
  isLoading,
  locale,
  registered,
  checkedIn,
  dayRows,
  streakRows,
  weeks,
}: {
  data: AdminRetentionStats | undefined;
  isLoading: boolean;
  locale: string;
  registered: number;
  checkedIn: number;
  dayRows: RetentionShareRow[];
  streakRows: RetentionShareRow[];
  weeks: AdminRetentionSignupWeek[];
}) {
  const t = useTranslations("adminRetention");

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-2">
        <MetricCard
          label={t("registered")}
          value={data ? String(registered) : "—"}
          loading={isLoading}
        />
        <MetricCard
          label={t("checkedIn")}
          value={data ? String(checkedIn) : "—"}
          hint={
            data
              ? t("checkedInHint", {
                  pct: formatRetentionPercent(checkedIn, registered),
                })
              : undefined
          }
          loading={isLoading}
        />
      </section>

      <ShareTable
        title={t("daysTitle")}
        hint={t("daysHint")}
        rows={dayRows}
        rowLabel={(row) => t("daysRow", { n: row.threshold })}
        columns={{
          milestone: t("colMilestone"),
          count: t("colCount"),
          ofRegistered: t("colOfRegistered"),
          ofCheckedIn: t("colOfCheckedIn"),
        }}
        footer={data ? t("maxDays", { n: data.days_used.max_days }) : undefined}
        loading={isLoading}
      />

      <ShareTable
        title={t("consecutiveTitle")}
        hint={t("consecutiveHint")}
        rows={streakRows}
        rowLabel={(row) => t("consecutiveRow", { n: row.threshold })}
        columns={{
          milestone: t("colMilestone"),
          count: t("colCount"),
          ofRegistered: t("colOfRegistered"),
          ofCheckedIn: t("colOfCheckedIn"),
        }}
        loading={isLoading}
      />

      <section className="space-y-3">
        <SectionHeading title={t("returnTitle")} hint={t("returnHint")} />
        <MetricCard
          label={t("returnTitle")}
          value={data ? String(data.return_next_day) : "—"}
          hint={
            data
              ? t("returnShares", {
                  ofRegistered: formatRetentionPercent(data.return_next_day, registered),
                  ofCheckedIn: formatRetentionPercent(data.return_next_day, checkedIn),
                })
              : undefined
          }
          loading={isLoading}
        />
      </section>

      <section className="space-y-3">
        <SectionHeading title={t("weeksTitle")} hint={t("weeksHint")} />
        <Card className="border-border/70">
          <CardContent className="p-3 sm:p-4">
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : weeks.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("weeksEmpty")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed text-left text-[11px] leading-snug sm:text-sm">
                  <thead className="border-b text-muted-foreground">
                    <tr>
                      <th className="w-[18%] px-1.5 py-2 font-medium whitespace-normal">{t("colWeek")}</th>
                      <th className="px-1.5 py-2 text-right font-medium whitespace-normal">{t("colWeekRegistered")}</th>
                      <th className="px-1.5 py-2 text-right font-medium whitespace-normal">{t("colWeekCheckedIn")}</th>
                      <th className="px-1.5 py-2 text-right font-medium whitespace-normal">{t("colWeekTwoDays")}</th>
                      <th className="px-1.5 py-2 text-right font-medium whitespace-normal">{t("colWeekReturn")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeks.map((week) => (
                      <WeekRow key={week.week} week={week} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {data?.as_of
          ? t("asOf", { time: formatRetentionAsOf(data.as_of, locale) })
          : null}
      </p>
      <p className="text-xs text-muted-foreground">{t("calendarNote")}</p>
    </>
  );
}

function WeekRow({ week }: { week: AdminRetentionSignupWeek }) {
  return (
    <tr className="border-b border-border/50">
      <th scope="row" className="px-1.5 py-2.5 text-left font-medium whitespace-normal">
        {week.week}
      </th>
      <td className="px-1.5 py-2.5 text-right align-top tabular-nums">{week.registered}</td>
      <td className="px-1.5 py-2.5 text-right align-top tabular-nums">{week.checked_in_once}</td>
      <td className="px-1.5 py-2.5 text-right align-top tabular-nums">{week.at_least_2_days}</td>
      <td className="px-1.5 py-2.5 text-right align-top tabular-nums">{week.returned_next_day}</td>
    </tr>
  );
}

function SectionHeading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="space-y-1">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  loading,
}: {
  label: string;
  value: string;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <Card className="border-border/70">
      <CardContent className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        )}
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}

function ShareTable({
  title,
  hint,
  rows,
  rowLabel,
  columns,
  footer,
  loading,
}: {
  title: string;
  hint: string;
  rows: RetentionShareRow[];
  rowLabel: (row: RetentionShareRow) => string;
  columns: {
    milestone: string;
    count: string;
    ofRegistered: string;
    ofCheckedIn: string;
  };
  footer?: string;
  loading?: boolean;
}) {
  return (
    <section className="space-y-3">
      <SectionHeading title={title} hint={hint} />
      <Card className="border-border/70">
        <CardContent className="p-3 sm:p-4">
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-left text-xs sm:text-sm">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th className="w-[40%] px-1.5 py-2 font-medium whitespace-normal">{columns.milestone}</th>
                    <th className="w-[18%] px-1.5 py-2 text-right font-medium whitespace-normal">{columns.count}</th>
                    <th className="px-1.5 py-2 text-right font-medium whitespace-normal">{columns.ofRegistered}</th>
                    <th className="px-1.5 py-2 text-right font-medium whitespace-normal">{columns.ofCheckedIn}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.threshold} className="border-b border-border/50">
                      <th scope="row" className="px-1.5 py-2.5 text-left font-medium whitespace-normal">
                        {rowLabel(row)}
                      </th>
                      <td className="px-1.5 py-2.5 text-right align-top tabular-nums">{row.count}</td>
                      <td className="px-1.5 py-2.5 text-right align-top tabular-nums">{row.ofRegistered}</td>
                      <td className="px-1.5 py-2.5 text-right align-top tabular-nums">{row.ofCheckedIn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {footer && !loading ? (
            <p className="mt-3 text-xs text-muted-foreground">{footer}</p>
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}
