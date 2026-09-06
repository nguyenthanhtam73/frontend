"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import {
  adminFunnelLoadError,
  d1Ratio,
  d1Ratio7d,
  formatPaywallCard,
  resolvePaywallViews7d,
} from "@/lib/admin/funnel-stats";
import {
  adminFunnelStatsQueryKey,
  fetchAdminFunnelStats,
} from "@/lib/api/admin-funnel";
import { useAdminGate } from "@/lib/hooks/use-admin-gate";
import { cn } from "@/lib/utils";

export function FunnelAdminView() {
  const t = useTranslations("adminFunnel");
  const tUsers = useTranslations("adminUsers");
  const formatter = useFormatter();
  const { hasAuth, isAdmin, authPending } = useAdminGate();

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: adminFunnelStatsQueryKey(),
    queryFn: () => fetchAdminFunnelStats(),
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
    const kind = adminFunnelLoadError(error);
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
    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex items-start gap-3 p-6 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p role="alert">{kind === "forbidden" ? tUsers("forbidden") : t("loadError")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <SectionHeading title={t("groups.signups")} />
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard
            label={t("cards.signedUp1d")}
            value={data ? String(data.signed_up_1d) : "—"}
            hint={t("cards.signedUp1dHint")}
            loading={isLoading}
          />
          <MetricCard
            label={t("cards.signedUp7d")}
            value={data ? String(data.signed_up_7d) : "—"}
            hint={t("cards.signedUp7dHint")}
            loading={isLoading}
          />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading title={t("groups.checkIns")} />
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            label={t("cards.checkInEver")}
            value={data ? String(data.skin_check_users_ever) : "—"}
            hint={t("cards.checkInEverHint")}
            loading={isLoading}
          />
          <MetricCard
            label={t("cards.checkIn1d")}
            value={data ? String(data.skin_check_users_1d) : "—"}
            hint={t("cards.checkIn1dHint")}
            loading={isLoading}
          />
          <MetricCard
            label={t("cards.checkIn7d")}
            value={data ? String(data.skin_check_users_7d) : "—"}
            hint={t("cards.checkIn7dHint")}
            loading={isLoading}
          />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading title={t("groups.sameDay")} />
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard
            label={t("cards.d0")}
            value={data ? String(data.d0_checkin_users) : "—"}
            hint={t("cards.d0Hint")}
            loading={isLoading}
          />
          <MetricCard
            label={t("cards.d07d")}
            value={data ? String(data.d0_checkin_users_7d) : "—"}
            hint={t("cards.d07dHint")}
            loading={isLoading}
          />
          <MetricCard
            label={t("cards.d1")}
            value={data ? d1Ratio(data) : "—"}
            hint={t("cards.d1Hint")}
            loading={isLoading}
          />
          <MetricCard
            label={t("cards.d17d")}
            value={data ? d1Ratio7d(data) : "—"}
            hint={t("cards.d17dHint")}
            loading={isLoading}
          />
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading title={t("groups.paid")} />
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            label={t("cards.paid7d")}
            value={data ? String(data.paid_orders_7d) : "—"}
            hint={t("cards.paid7dHint")}
            loading={isLoading}
          />
          <MetricCard
            label={t("cards.paywall1d")}
            value={data ? formatPaywallCard(data.paywall_views_1d, t("paywallNa")) : "—"}
            hint={t("cards.paywall1dHint")}
            loading={isLoading}
          />
          <MetricCard
            label={t("cards.paywall7d")}
            value={data ? formatPaywallCard(resolvePaywallViews7d(data), t("paywallNa")) : "—"}
            hint={t("cards.paywall7dHint")}
            loading={isLoading}
          />
        </div>
      </section>

      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        {data?.as_of
          ? t("asOf", {
              time: formatter.dateTime(new Date(data.as_of), {
                dateStyle: "short",
                timeStyle: "short",
              }),
            })
          : null}
        {isFetching ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : null}
      </p>
      <p className="text-xs text-muted-foreground">{t("calendarNote")}</p>
    </div>
  );
}

function SectionHeading({ title }: { title: string }) {
  return <h2 className="text-lg font-semibold tracking-tight">{title}</h2>;
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
      <CardContent className="space-y-1">
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
