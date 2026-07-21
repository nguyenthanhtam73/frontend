"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/i18n/navigation";
import {
  adminFeedbacksQueryKey,
  fetchAdminFeedbacks,
  updateAdminFeedbackStatus,
} from "@/lib/api/feedback";
import { useAdminGate } from "@/lib/hooks/use-admin-gate";
import { useAuthStore } from "@/lib/stores/auth-store";
import type { FeedbackStatus, FeedbackType } from "@/lib/types/feedback";
import { FEEDBACK_STATUSES, FEEDBACK_TYPES } from "@/lib/types/feedback";
import { cn } from "@/lib/utils";

const selectClass =
  "min-h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export function FeedbacksAdminView() {
  const t = useTranslations("adminFeedbacks");
  const tUsers = useTranslations("adminUsers");
  const formatter = useFormatter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { hasAuth, isAdmin, authPending } = useAdminGate();

  const [typeFilter, setTypeFilter] = useState<FeedbackType | "">("");
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | "">("");
  const [page, setPage] = useState(1);

  const query = useMemo(
    () => ({
      type: typeFilter,
      status: statusFilter,
      page,
      page_size: 20,
    }),
    [typeFilter, statusFilter, page],
  );

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: adminFeedbacksQueryKey(query),
    queryFn: () => fetchAdminFeedbacks(query),
    enabled: !authPending && hasAuth && isAdmin,
    retry: false,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: FeedbackStatus }) =>
      updateAdminFeedbackStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "feedbacks"] });
      toast.success(t("statusUpdated"));
    },
    onError: (err) => {
      if (err instanceof Error && err.message === "forbidden") {
        toast.error(t("forbidden"));
        return;
      }
      toast.error(t("statusError"));
    },
  });

  if (authPending) {
    return (
      <Card className="border-border/70">
        <CardContent className="space-y-3 p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {tUsers("authLoading")}
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="border-dashed border-primary/25">
        <CardContent className="space-y-3 p-6">
          <p className="text-sm text-muted-foreground">{t("needAuth")}</p>
          <Link href="/login" className={buttonVariants({ size: "sm" })}>
            {t("signIn")}
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
            {t("forbidden")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.page_size)) : 1;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <FilterField label={t("filterType")}>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as FeedbackType | "");
              setPage(1);
            }}
            className={selectClass}
            aria-label={t("filterType")}
          >
            <option value="">{t("filterAll")}</option>
            {FEEDBACK_TYPES.map((key) => (
              <option key={key} value={key}>
                {t(`types.${key}`)}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label={t("filterStatus")}>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as FeedbackStatus | "");
              setPage(1);
            }}
            className={selectClass}
            aria-label={t("filterStatus")}
          >
            <option value="">{t("filterAll")}</option>
            {FEEDBACK_STATUSES.map((key) => (
              <option key={key} value={key}>
                {t(`statuses.${key}`)}
              </option>
            ))}
          </select>
        </FilterField>
      </div>

      {isLoading ? (
        <AdminSkeleton />
      ) : isError ? (
        <Card className="border-destructive/30">
          <CardContent className="space-y-3 p-6">
            <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
              {error instanceof Error && error.message === "forbidden"
                ? t("forbidden")
                : t("loadError")}
            </p>
          </CardContent>
        </Card>
      ) : !data?.items.length ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {t("empty")}
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {t("resultCount", { n: data.total })}
            {isFetching ? (
              <Loader2 className="ml-2 inline size-3 animate-spin" aria-hidden />
            ) : null}
          </p>

          <div className="hidden overflow-x-auto rounded-xl border md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">{t("colType")}</th>
                  <th className="px-4 py-3 font-medium">{t("colComment")}</th>
                  <th className="px-4 py-3 font-medium">{t("colUser")}</th>
                  <th className="px-4 py-3 font-medium">{t("colTime")}</th>
                  <th className="px-4 py-3 font-medium">{t("colStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.id} className="border-b border-border/50 align-top last:border-0">
                    <td className="px-4 py-3 whitespace-nowrap">
                      {t(`types.${item.type}`)}
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <p className="line-clamp-4 whitespace-pre-wrap">{item.comment}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{item.user_email || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.user_username || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                      {formatDate(formatter, item.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusSelect
                        value={item.status}
                        disabled={statusMutation.isPending}
                        onChange={(status) =>
                          statusMutation.mutate({ id: item.id, status })
                        }
                        labels={(key) => t(`statuses.${key}`)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {data.items.map((item) => (
              <Card key={item.id}>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {t(`types.${item.type}`)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(formatter, item.created_at)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.comment}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.user_email}
                    {item.user_username ? ` · @${item.user_username}` : ""}
                  </p>
                  <StatusSelect
                    value={item.status}
                    disabled={statusMutation.isPending}
                    onChange={(status) => statusMutation.mutate({ id: item.id, status })}
                    labels={(key) => t(`statuses.${key}`)}
                  />
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t("prevPage")}
              </Button>
              <span className="text-xs text-muted-foreground">
                {t("pageOf", { page, total: totalPages })}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                {t("nextPage")}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function StatusSelect({
  value,
  onChange,
  disabled,
  labels,
}: {
  value: FeedbackStatus;
  onChange: (status: FeedbackStatus) => void;
  disabled?: boolean;
  labels: (key: FeedbackStatus) => string;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as FeedbackStatus)}
      className={cn(selectClass, "min-w-[8.5rem]")}
      aria-label="status"
    >
      {FEEDBACK_STATUSES.map((key) => (
        <option key={key} value={key}>
          {labels(key)}
        </option>
      ))}
    </select>
  );
}

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function formatDate(
  formatter: ReturnType<typeof useFormatter>,
  iso: string,
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return formatter.dateTime(d, { dateStyle: "medium", timeStyle: "short" });
}

function AdminSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}
