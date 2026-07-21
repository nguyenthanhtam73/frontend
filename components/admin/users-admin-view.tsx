"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/i18n/navigation";
import {
  adminUserDetailQueryKey,
  adminUsersQueryKey,
  fetchAdminUserDetail,
  fetchAdminUsers,
  updateAdminUserPlan,
} from "@/lib/api/admin-users";
import { useAdminGate } from "@/lib/hooks/use-admin-gate";
import { useAuthStore } from "@/lib/stores/auth-store";
import {
  ADMIN_PLAN_TIERS,
  type AdminPlanTier,
  type AdminUserListItem,
} from "@/lib/types/admin-user";
import { cn } from "@/lib/utils";

const selectClass =
  "min-h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const inputClass =
  "min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

/** Single-dialog steps: edit form → inline confirm (no nested Dialog). */
type PlanDialogStep = "edit" | "confirm";

export function UsersAdminView() {
  const t = useTranslations("adminUsers");
  const formatter = useFormatter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { hasAuth, isAdmin, authPending } = useAdminGate();

  const [searchInput, setSearchInput] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<AdminUserListItem | null>(null);
  const [nextPlan, setNextPlan] = useState<AdminPlanTier>("premium");
  const [reason, setReason] = useState("");
  const [dialogStep, setDialogStep] = useState<PlanDialogStep>("edit");

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setQ(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const query = useMemo(
    () => ({ q, page, page_size: 20 }),
    [q, page],
  );

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: adminUsersQueryKey(query),
    queryFn: () => fetchAdminUsers(query),
    enabled: !authPending && hasAuth && isAdmin,
    retry: false,
  });

  const detailQuery = useQuery({
    queryKey: adminUserDetailQueryKey(selected?.id ?? ""),
    queryFn: () => fetchAdminUserDetail(selected!.id),
    enabled: !authPending && hasAuth && isAdmin && !!selected?.id,
    retry: false,
  });

  const planMutation = useMutation({
    mutationFn: () => updateAdminUserPlan(selected!.id, nextPlan, reason),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      setSelected(res.user);
      setDialogStep("edit");
      setReason("");
      toast.success(t("planUpdated", { plan: t(`plans.${res.user.plan_tier}`) }));
    },
    onError: (err) => {
      if (err instanceof Error) {
        if (err.message === "forbidden") {
          toast.error(t("forbidden"));
          return;
        }
        if (err.message === "plan_unchanged") {
          toast.error(t("planUnchanged"));
          return;
        }
      }
      toast.error(t("planError"));
    },
  });

  const closeDialog = () => {
    setSelected(null);
    setDialogStep("edit");
    setReason("");
  };

  /** Escape / overlay: confirm → back to edit; edit → close. */
  const handleDialogOpenChange = (open: boolean) => {
    if (open) return;
    if (planMutation.isPending) return;
    if (dialogStep === "confirm") {
      setDialogStep("edit");
      return;
    }
    closeDialog();
  };

  // 1) Hydrating /me — never flash forbidden
  if (authPending) {
    return (
      <Card className="border-border/70">
        <CardContent className="space-y-3 p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {t("authLoading")}
          </div>
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  // 2) No session after hydrate
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

  // 3) Hydrated non-admin
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
  const currentPlan = (selected?.plan_tier || "free") as AdminPlanTier;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block flex-1">
          <span className="sr-only">{t("searchLabel")}</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className={cn(inputClass, "pl-9")}
            autoComplete="off"
          />
        </label>
        {isFetching ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
        ) : null}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : isError ? (
        <Card className="border-destructive/30">
          <CardContent className="p-6">
            <p role="alert" className="text-sm text-destructive">
              {error instanceof Error && error.message === "forbidden"
                ? t("forbidden")
                : t("loadError")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {t("resultCount", { n: data?.total ?? 0 })}
          </p>

          <Card className="overflow-hidden border-border/70">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>{t("colUser")}</TableHead>
                  <TableHead>{t("colEmail")}</TableHead>
                  <TableHead>{t("colPlan")}</TableHead>
                  <TableHead>{t("colCreated")}</TableHead>
                  <TableHead className="text-right">{t("colActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.items ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                      {t("empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  (data?.items ?? []).map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={selected?.id === row.id ? "selected" : undefined}
                    >
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-medium">
                            {row.display_name || row.username}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            @{row.username}
                            {row.is_admin ? ` · ${t("adminBadge")}` : ""}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[14rem] truncate">{row.email}</TableCell>
                      <TableCell>
                        <PlanBadge plan={row.plan_tier} t={t} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatter.dateTime(new Date(row.created_at), {
                          dateStyle: "medium",
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelected(row);
                            setDialogStep("edit");
                            setNextPlan(
                              row.plan_tier === "free"
                                ? "premium"
                                : (row.plan_tier as AdminPlanTier),
                            );
                          }}
                        >
                          {t("manageCta")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              {t("prevPage")}
            </Button>
            <p className="text-xs text-muted-foreground">
              {t("pageOf", { page, total: totalPages })}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("nextPage")}
            </Button>
          </div>
        </>
      )}

      {/* One Dialog only — confirm is an in-dialog step (Escape returns to edit). */}
      <Dialog open={!!selected} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {selected && dialogStep === "edit" ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("detailTitle")}</DialogTitle>
                <DialogDescription>
                  {selected.email} · @{selected.username}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">{t("currentPlan")}</span>
                  <PlanBadge plan={selected.plan_tier} t={t} />
                </div>

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">{t("changePlan")}</span>
                  <select
                    className={selectClass}
                    value={nextPlan}
                    onChange={(e) => setNextPlan(e.target.value as AdminPlanTier)}
                  >
                    {ADMIN_PLAN_TIERS.map((tier) => (
                      <option key={tier} value={tier}>
                        {t(`plans.${tier}`)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-sm font-medium">{t("reasonLabel")}</span>
                  <input
                    type="text"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t("reasonPlaceholder")}
                    className={inputClass}
                    maxLength={500}
                  />
                </label>

                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("recentChanges")}</p>
                  {detailQuery.isLoading ? (
                    <Skeleton className="h-16 w-full" />
                  ) : detailQuery.isError ? (
                    <p className="text-xs text-destructive">{t("detailError")}</p>
                  ) : (detailQuery.data?.recent_changes?.length ?? 0) === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("noChanges")}</p>
                  ) : (
                    <ul className="max-h-40 space-y-2 overflow-y-auto rounded-lg border border-border/60 p-2">
                      {detailQuery.data!.recent_changes.map((log) => (
                        <li
                          key={log.id}
                          className="rounded-md bg-muted/40 px-2.5 py-2 text-xs leading-relaxed"
                        >
                          <span className="font-medium">
                            {t(`plans.${log.from_plan}`)} → {t(`plans.${log.to_plan}`)}
                          </span>
                          <br />
                          <span className="text-muted-foreground">
                            {log.actor_email} ·{" "}
                            {formatter.dateTime(new Date(log.created_at), {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                            {log.reason ? ` · ${log.reason}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={closeDialog}>
                  {t("close")}
                </Button>
                <Button
                  type="button"
                  disabled={nextPlan === currentPlan || planMutation.isPending}
                  onClick={() => setDialogStep("confirm")}
                >
                  {t("applyPlan")}
                </Button>
              </DialogFooter>
            </>
          ) : null}

          {selected && dialogStep === "confirm" ? (
            <>
              <DialogHeader>
                <DialogTitle>{t("confirmTitle")}</DialogTitle>
                <DialogDescription>
                  {t("confirmBody", {
                    email: selected.email,
                    from: t(`plans.${currentPlan}`),
                    to: t(`plans.${nextPlan}`),
                  })}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  disabled={planMutation.isPending}
                  onClick={() => setDialogStep("edit")}
                >
                  {t("cancel")}
                </Button>
                <Button
                  type="button"
                  disabled={planMutation.isPending}
                  onClick={() => planMutation.mutate()}
                >
                  {planMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      {t("saving")}
                    </>
                  ) : (
                    t("confirmCta")
                  )}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlanBadge({
  plan,
  t,
}: {
  plan: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const normalized = ADMIN_PLAN_TIERS.includes(plan as AdminPlanTier)
    ? plan
    : "free";
  const variant =
    normalized === "premium_plus"
      ? "default"
      : normalized === "premium"
        ? "success"
        : "secondary";
  return (
    <Badge variant={variant as "default" | "success" | "secondary"}>
      {t(`plans.${normalized}`)}
    </Badge>
  );
}
