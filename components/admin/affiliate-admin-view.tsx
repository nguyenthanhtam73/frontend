"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import {
  adminAffiliateMetricsQueryKey,
  fetchAdminAffiliateMetrics,
} from "@/lib/api/admin-affiliate";
import { useAdminGate } from "@/lib/hooks/use-admin-gate";
import { cn } from "@/lib/utils";

export function AffiliateAdminView() {
  const t = useTranslations("adminAffiliate");
  const tUsers = useTranslations("adminUsers");
  const formatter = useFormatter();
  const { hasAuth, isAdmin, authPending } = useAdminGate();

  const { data, isLoading, isError, error, isFetching, refetch } = useQuery({
    queryKey: adminAffiliateMetricsQueryKey(50),
    queryFn: () => fetchAdminAffiliateMetrics(50),
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
      <Card className="border-border/70">
        <CardContent className="p-6 text-sm text-muted-foreground">{tUsers("forbidden")}</CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-destructive/40">
        <CardContent className="flex items-start gap-2 p-6 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error instanceof Error ? error.message : t("loadError")}</span>
        </CardContent>
      </Card>
    );
  }

  const rows = data?.top_skus ?? [];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label={t("kpi7d")} value={data?.clicks_7d} loading={isLoading} />
        <Kpi label={t("kpi30d")} value={data?.clicks_30d} loading={isLoading} />
        <Kpi label={t("kpiTotal")} value={data?.clicks_total} loading={isLoading} />
      </div>

      <Card className="border-border/70">
        <CardContent className="space-y-3 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">{t("tableTitle")}</h2>
            {isFetching ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
            ) : null}
          </div>

          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-2 py-2 font-medium">{t("colSku")}</th>
                    <th className="px-2 py-2 font-medium">{t("colLink")}</th>
                    <th className="px-2 py-2 font-medium">{t("col7d")}</th>
                    <th className="px-2 py-2 font-medium">{t("col30d")}</th>
                    <th className="px-2 py-2 font-medium">{t("colTotal")}</th>
                    <th className="px-2 py-2 font-medium">{t("colLast")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={`${r.product_id ?? r.product_name}-${r.affiliate_link}`}
                      className="border-b border-border/50"
                    >
                      <td className="px-2 py-2.5">
                        <p className="font-medium">{r.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {[r.brand, r.product_id].filter(Boolean).join(" · ")}
                        </p>
                      </td>
                      <td className="px-2 py-2.5">
                        {r.affiliate_link ? (
                          <a
                            href={r.affiliate_link}
                            target="_blank"
                            rel="noopener noreferrer sponsored"
                            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
                          >
                            {t("openLink")}
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 tabular-nums">{r.clicks_7d}</td>
                      <td className="px-2 py-2.5 tabular-nums">{r.clicks_30d}</td>
                      <td className="px-2 py-2.5 tabular-nums">{r.clicks_total}</td>
                      <td className="px-2 py-2.5 text-xs text-muted-foreground">
                        {r.last_click_at
                          ? formatter.dateTime(new Date(r.last_click_at), {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data?.as_of ? (
            <p className="text-[11px] text-muted-foreground">
              {t("asOf", {
                date: formatter.dateTime(new Date(data.as_of), {
                  dateStyle: "medium",
                  timeStyle: "short",
                }),
              })}
            </p>
          ) : null}

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            {t("refresh")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  loading,
}: {
  label: string;
  value?: number;
  loading?: boolean;
}) {
  return (
    <Card className="border-border/70">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {loading ? (
          <Skeleton className="mt-2 h-8 w-16" />
        ) : (
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value ?? 0}</p>
        )}
      </CardContent>
    </Card>
  );
}
