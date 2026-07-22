"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import {
  adminPaymentMetricsQueryKey,
  fetchAdminPaymentMetrics,
} from "@/lib/api/admin-payments";
import { useAdminGate } from "@/lib/hooks/use-admin-gate";
import {
  ADMIN_PAYMENT_STATUSES,
  type AdminPaymentStatusFilter,
} from "@/lib/types/admin-payment";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const selectClass =
  "min-h-9 w-full max-w-xs rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function formatVnd(n: number, locale: string) {
  try {
    return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US").format(n) + " ₫";
  } catch {
    return `${n} ₫`;
  }
}

export function PaymentsAdminView() {
  const t = useTranslations("adminPayments");
  const tUsers = useTranslations("adminUsers");
  const formatter = useFormatter();
  const locale = useLocale();
  const { hasAuth, isAdmin, authPending } = useAdminGate();

  const [statusFilter, setStatusFilter] = useState<AdminPaymentStatusFilter>("");
  const [page, setPage] = useState(1);

  const query = useMemo(
    () => ({
      status: statusFilter,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    [statusFilter, page],
  );

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: adminPaymentMetricsQueryKey(query),
    queryFn: () => fetchAdminPaymentMetrics(query),
    enabled: !authPending && hasAuth && isAdmin,
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
      <Card className="border-border/70">
        <CardContent className="flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-muted-foreground">{tUsers("needAuth")}</p>
          <Link href="/login" className={cn(buttonVariants())}>
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
          <p>{tUsers("forbidden")}</p>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    const msg =
      error instanceof Error && error.message === "forbidden"
        ? tUsers("forbidden")
        : t("loadError");
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-start gap-3 p-6 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p>{msg}</p>
        </CardContent>
      </Card>
    );
  }

  const totalPages = Math.max(1, Math.ceil((data?.recent_payments_total ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={t("cards.revenue")}
          value={data ? formatVnd(data.total_revenue, locale) : "—"}
          hint={t("cards.revenueHint")}
          loading={isLoading}
        />
        <MetricCard
          label={t("cards.successRate")}
          value={data ? `${data.success_rate.toFixed(1)}%` : "—"}
          hint={t("cards.successRateHint", { n: data?.today_payments ?? 0 })}
          loading={isLoading}
        />
        <MetricCard
          label={t("cards.activePremium")}
          value={data ? String(data.active_premium_count) : "—"}
          hint={t("cards.webhookErrors", { n: data?.webhook_errors_last_24h ?? 0 })}
          loading={isLoading}
        />
        <MetricCard
          label={t("cards.failed")}
          value={data ? String(data.failed_count) : "—"}
          hint={t("cards.asOf", {
            time: data
              ? formatter.dateTime(new Date(data.as_of), {
                  dateStyle: "short",
                  timeStyle: "short",
                })
              : "—",
          })}
          loading={isLoading}
        />
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{t("recentTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("recentSub")}</p>
          </div>
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">{t("statusFilter")}</span>
            <select
              className={selectClass}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as AdminPaymentStatusFilter);
                setPage(1);
              }}
            >
              {ADMIN_PAYMENT_STATUSES.map((s) => (
                <option key={s || "all"} value={s}>
                  {s ? t(`statuses.${s}`) : t("statuses.all")}
                </option>
              ))}
            </select>
          </label>
        </div>

        <Card className="overflow-hidden border-border/70">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("col.invoice")}</th>
                  <th className="px-4 py-3 font-medium">{t("col.plan")}</th>
                  <th className="px-4 py-3 font-medium">{t("col.amount")}</th>
                  <th className="px-4 py-3 font-medium">{t("col.status")}</th>
                  <th className="px-4 py-3 font-medium">{t("col.created")}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-muted-foreground">
                      <Loader2 className="mr-2 inline size-4 animate-spin" />
                      {t("loadingTable")}
                    </td>
                  </tr>
                ) : !data?.recent_payments.length ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-muted-foreground">
                      {t("empty")}
                    </td>
                  </tr>
                ) : (
                  data.recent_payments.map((row) => (
                    <tr key={row.id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3 font-mono text-xs">{row.invoice_number}</td>
                      <td className="px-4 py-3">
                        {row.plan}
                        <span className="text-muted-foreground"> · {row.billing_interval}</span>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {formatVnd(row.amount_vnd, locale)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill
                          status={row.status}
                          label={
                            ADMIN_PAYMENT_STATUSES.includes(
                              row.status as AdminPaymentStatusFilter,
                            ) && row.status
                              ? t(`statuses.${row.status}`)
                              : row.status
                          }
                        />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatter.dateTime(new Date(row.created_at), {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3 text-sm">
            <p className="text-muted-foreground">
              {t("resultCount", { n: data?.recent_payments_total ?? 0 })}
              {isFetching ? (
                <Loader2 className="ml-2 inline size-3.5 animate-spin" aria-hidden />
              ) : null}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {tUsers("prevPage")}
              </Button>
              <span className="flex items-center text-muted-foreground">
                {tUsers("pageOf", { page, total: totalPages })}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {tUsers("nextPage")}
              </Button>
            </div>
          </div>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">{t("upcomingTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("upcomingSub")}</p>
        <Card className="overflow-hidden border-border/70">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("col.email")}</th>
                  <th className="px-4 py-3 font-medium">{t("col.plan")}</th>
                  <th className="px-4 py-3 font-medium">{t("col.expires")}</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-muted-foreground">
                      <Skeleton className="h-6 w-2/3" />
                    </td>
                  </tr>
                ) : !data?.upcoming_expiries.length ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-muted-foreground">
                      {t("upcomingEmpty")}
                    </td>
                  </tr>
                ) : (
                  data.upcoming_expiries.map((row) => (
                    <tr key={row.user_id} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-3">{row.email}</td>
                      <td className="px-4 py-3">{row.plan}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatter.dateTime(new Date(row.plan_expires_at), {
                          dateStyle: "medium",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </section>
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
  hint: string;
  loading?: boolean;
}) {
  return (
    <Card className="border-border/70">
      <CardContent className="space-y-1 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
        )}
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function StatusPill({ status, label }: { status: string; label: string }) {
  const tone =
    status === "paid"
      ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
      : status === "pending"
        ? "bg-amber-500/15 text-amber-900 dark:text-amber-200"
        : status === "failed" || status === "expired"
          ? "bg-destructive/15 text-destructive"
          : "bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex rounded-md px-2 py-0.5 text-xs font-medium", tone)}>
      {label}
    </span>
  );
}
