"use client";

import { useQuery } from "@tanstack/react-query";
import { Camera, ChevronLeft, ChevronRight, Loader2, Package } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import {
  adminActivityQueryKey,
  fetchAdminActivity,
} from "@/lib/api/admin-activity";
import { sameOriginUploadUrl } from "@/lib/api/admin-skin-review";
import { useAdminGate } from "@/lib/hooks/use-admin-gate";
import { useAuthStore } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";

const inputClass =
  "min-h-10 rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function shiftIsoDate(iso: string, delta: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + delta));
  return dt.toISOString().slice(0, 10);
}

export function ActivityAdminView() {
  const t = useTranslations("adminActivity");
  const tUsers = useTranslations("adminUsers");
  const formatter = useFormatter();
  const user = useAuthStore((s) => s.user);
  const { hasAuth, isAdmin, authPending } = useAdminGate();

  const [date, setDate] = useState("");

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: adminActivityQueryKey(date || undefined),
    queryFn: () => fetchAdminActivity(date || undefined),
    enabled: !authPending && hasAuth && isAdmin,
    retry: false,
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

  if (!user) {
    return (
      <Card className="border-dashed border-primary/25">
        <CardContent className="space-y-3 p-6">
          <p className="text-sm text-muted-foreground">{tUsers("needAuth")}</p>
          <Link href="/login" className={buttonVariants({ size: "sm" })}>
            {tUsers("signIn")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="space-y-2 p-6">
          <p role="alert" className="text-sm text-destructive">
            {tUsers("forbidden")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const activeDate = date || data?.date || "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!activeDate}
          onClick={() => activeDate && setDate(shiftIsoDate(activeDate, -1))}
        >
          <ChevronLeft className="size-4" aria-hidden />
          {t("prevDay")}
        </Button>
        <label className="flex items-center gap-2 text-sm">
          <span className="sr-only">{t("dateLabel")}</span>
          <input
            type="date"
            className={inputClass}
            value={activeDate}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!activeDate}
          onClick={() => activeDate && setDate(shiftIsoDate(activeDate, 1))}
        >
          {t("nextDay")}
          <ChevronRight className="size-4" aria-hidden />
        </Button>
        {isFetching ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : isError ? (
        <Card className="border-destructive/30">
          <CardContent className="p-6">
            <p role="alert" className="text-sm text-destructive">
              {error instanceof Error && error.message === "forbidden"
                ? tUsers("forbidden")
                : t("loadError")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard
              label={t("statCheckIns")}
              value={data?.check_in_count ?? 0}
              hint={t("statCheckInsHint", { n: data?.check_in_photo_count ?? 0 })}
            />
            <StatCard
              label={t("statPhotos")}
              value={data?.check_in_photo_count ?? 0}
              hint={t("statPhotosHint")}
            />
            <StatCard
              label={t("statProducts")}
              value={data?.product_usage_count ?? 0}
              hint={t("statProductsHint")}
            />
          </div>

          <Card className="border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Camera className="size-4" aria-hidden />
                {t("checkInsTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0 sm:pt-0">
              {(data?.check_ins ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("checkInsEmpty")}</p>
              ) : (
                (data?.check_ins ?? []).map((row) => (
                  <div
                    key={row.check_id}
                    className="rounded-lg border border-border/60 p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {row.display_name || row.username}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            @{row.username}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">{row.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={row.has_photos ? "success" : "secondary"}>
                          {row.has_photos
                            ? t("badgeWithPhoto", { n: row.photo_count })
                            : t("badgeNoPhoto")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatter.dateTime(new Date(row.created_at), {
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                    </div>
                    {row.photo_urls.length > 0 ? (
                      <ul className="mt-3 flex flex-wrap gap-2">
                        {row.photo_urls.map((url) => (
                          <li key={url}>
                            <a
                              href={sameOriginUploadUrl(url)}
                              target="_blank"
                              rel="noreferrer"
                              className="block size-20 overflow-hidden rounded-md border border-border/60 bg-muted"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={sameOriginUploadUrl(url)}
                                alt=""
                                className="size-full object-cover"
                              />
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="size-4" aria-hidden />
                {t("productsTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0 sm:pt-0">
              {(data?.product_usage ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("productsEmpty")}</p>
              ) : (
                (data?.product_usage ?? []).map((row) => (
                  <div
                    key={row.user_id}
                    className="rounded-lg border border-border/60 p-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">
                          {row.display_name || row.username}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            @{row.username}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">{row.email}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t("amPmTicks", {
                          am: row.morning_ticked,
                          pm: row.evening_ticked,
                        })}
                      </p>
                    </div>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {row.ticked_titles.map((title, i) => (
                        <li key={`${row.user_id}-${i}`}>
                          <Badge variant="secondary">{title}</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <Card className="border-border/70">
      <CardContent>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className={cn("mt-1 text-2xl font-semibold tabular-nums")}>{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
