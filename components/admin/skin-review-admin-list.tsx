"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  Globe,
  GlobeOff,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { SkinReviewQaBlock } from "@/components/share/skin-review-qa-block";
import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  adminSkinReviewsQueryKey,
  fetchAdminSkinReview,
  fetchAdminSkinReviews,
  patchAdminSkinReview,
  publishAdminSkinReview,
  skinReviewShareUrl,
  suggestAdminSkinReviewAnswer,
  unpublishAdminSkinReview,
} from "@/lib/api/admin-skin-review";
import type {
  AdminSkinReviewListItem,
  AdminSkinReviewResponse,
} from "@/lib/types/admin-skin-review";
import { cn } from "@/lib/utils";

import { SkinReviewAnalysisView } from "./skin-review-analysis-view";

const detailInputClass =
  "min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

type StatusFilter = "" | "draft" | "published";

type Props = {
  enabled: boolean;
  onOpenCreate?: () => void;
};

/** Admin table of saved skin reviews with filter + share actions. */
export function SkinReviewAdminList({ enabled, onOpenCreate }: Props) {
  const t = useTranslations("adminSkinReview");
  const locale = useLocale();
  const formatter = useFormatter();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<StatusFilter>("");
  const [page, setPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<AdminSkinReviewResponse | null>(null);
  const [editQuestion, setEditQuestion] = useState("");
  const [editAnswer, setEditAnswer] = useState("");

  const query = useMemo(
    () => ({ status, page, page_size: 20 }),
    [status, page],
  );

  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: adminSkinReviewsQueryKey(query),
    queryFn: () => fetchAdminSkinReviews(query),
    enabled,
    retry: false,
  });

  useEffect(() => {
    if (!detail) {
      setEditQuestion("");
      setEditAnswer("");
      return;
    }
    setEditQuestion(detail.user_question ?? "");
    setEditAnswer(detail.answer ?? "");
  }, [detail]);

  const unpublishMutation = useMutation({
    mutationFn: (id: string) => unpublishAdminSkinReview(id),
    onSuccess: () => {
      toast.success(t("unpublishSuccess"));
      void queryClient.invalidateQueries({ queryKey: ["admin", "skin-reviews"] });
      if (detail) setDetail(null);
    },
    onError: () => toast.error(t("unpublishError")),
  });

  const detailMutation = useMutation({
    mutationFn: (id: string) => fetchAdminSkinReview(id),
    onSuccess: (res) => setDetail(res),
    onError: () => toast.error(t("detailError")),
  });

  const saveQaMutation = useMutation({
    mutationFn: (vars: {
      id: string;
      user_question: string;
      answer: string;
      is_public?: boolean;
    }) => {
      const q = vars.user_question.trim();
      const a = vars.answer.trim();
      if (vars.is_public && q && !a) {
        throw new Error("missing_answer");
      }
      return patchAdminSkinReview(vars.id, {
        user_question: vars.user_question,
        answer: vars.answer,
      });
    },
    onSuccess: (res, vars) => {
      // Ignore stale responses if admin already opened another review.
      if (detail?.id !== vars.id) return;
      setDetail(res);
      setEditQuestion(res.user_question ?? "");
      setEditAnswer(res.answer ?? "");
      toast.success(t("saveSuccess"));
      void queryClient.invalidateQueries({ queryKey: ["admin", "skin-reviews"] });
    },
    onError: (err) => {
      const msg =
        err instanceof Error && err.message === "missing_answer"
          ? t("publishNeedsAnswer")
          : t("saveError");
      toast.error(msg);
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (vars: {
      id: string;
      user_question: string;
      answer: string;
    }) => {
      const q = vars.user_question.trim();
      const a = vars.answer.trim();
      if (q && !a) throw new Error("missing_answer");
      await patchAdminSkinReview(vars.id, {
        user_question: vars.user_question,
        answer: vars.answer,
      });
      return publishAdminSkinReview(vars.id);
    },
    onSuccess: (res) => {
      setDetail(res);
      setEditQuestion(res.user_question ?? "");
      setEditAnswer(res.answer ?? "");
      toast.success(t("publishSuccess"));
      void queryClient.invalidateQueries({ queryKey: ["admin", "skin-reviews"] });
    },
    onError: (err) => {
      const msg =
        err instanceof Error && err.message === "missing_answer"
          ? t("publishNeedsAnswer")
          : t("publishError");
      toast.error(msg);
    },
  });

  const suggestQaMutation = useMutation({
    mutationFn: (vars: { id: string; user_question: string }) =>
      suggestAdminSkinReviewAnswer(vars.id, {
        user_question: vars.user_question,
      }),
    onSuccess: (res, vars) => {
      if (detail?.id !== vars.id) return;
      setEditAnswer(res.answer ?? "");
      toast.success(t("suggestAnswerSuccess"));
    },
    onError: (err) => {
      const msg =
        err instanceof Error && err.message === "missing_question"
          ? t("needUserQuestion")
          : t("suggestAnswerError");
      toast.error(msg);
    },
  });

  const detailBusy =
    detailMutation.isPending ||
    saveQaMutation.isPending ||
    suggestQaMutation.isPending ||
    publishMutation.isPending;

  async function copyLink(item: AdminSkinReviewListItem) {
    if (!item.public_slug) return;
    const url = skinReviewShareUrl(item.public_slug, locale);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(item.id);
      toast.success(t("copySuccess"));
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error(t("copyError"));
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError) {
    return <p className="text-sm text-destructive">{t("listError")}</p>;
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageSize = data?.page_size ?? 20;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["", "filterAll"],
              ["draft", "filterDraft"],
              ["published", "filterPublished"],
            ] as const
          ).map(([value, key]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setStatus(value);
                setPage(1);
              }}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
                status === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80",
              )}
            >
              {t(key)}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("resultCount", { n: total })}
          {isFetching ? " …" : ""}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
          <p className="text-sm text-muted-foreground">{t("listEmpty")}</p>
          {onOpenCreate ? (
            <Button type="button" className="mt-4" onClick={onOpenCreate}>
              {t("tabCreate")}
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("colTitle")}</TableHead>
                <TableHead>{t("colStatus")}</TableHead>
                <TableHead>{t("colPublishedAt")}</TableHead>
                <TableHead>{t("colSlug")}</TableHead>
                <TableHead className="text-right">{t("colActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const shareUrl =
                  item.is_public && item.public_slug
                    ? skinReviewShareUrl(item.public_slug, locale)
                    : null;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-[14rem] font-medium">
                      <span className="line-clamp-2">
                        {item.title?.trim() || t("untitled")}
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={item.status}
                        isPublic={item.is_public}
                        t={t}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {item.published_at
                        ? formatter.dateTime(new Date(item.published_at), {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {item.public_slug || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={detailBusy}
                          onClick={() => detailMutation.mutate(item.id)}
                          aria-label={t("viewDetail")}
                        >
                          {detailMutation.isPending ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Eye className="size-3.5" />
                          )}
                        </Button>
                        {shareUrl ? (
                          <>
                            <a
                              href={shareUrl}
                              target="_blank"
                              rel="noreferrer"
                              className={cn(
                                buttonVariants({ size: "sm", variant: "ghost" }),
                              )}
                              aria-label={t("openShareCta")}
                            >
                              <ExternalLink className="size-3.5" />
                            </a>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => void copyLink(item)}
                              aria-label={t("copyLinkCta")}
                            >
                              {copiedId === item.id ? (
                                <Check className="size-3.5" />
                              ) : (
                                <Copy className="size-3.5" />
                              )}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={unpublishMutation.isPending}
                              onClick={() => unpublishMutation.mutate(item.id)}
                              aria-label={t("unpublishCta")}
                            >
                              <GlobeOff className="size-3.5" />
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
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
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("nextPage")}
          </Button>
        </div>
      ) : null}

      {detail ? (
        <div className="space-y-4 rounded-2xl border border-border bg-muted/30 p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">
                {detail.title?.trim() || t("untitled")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("resultMeta", {
                  id: detail.id,
                  model: detail.model_used || "—",
                })}
              </p>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={() => setDetail(null)}>
              {t("closeDetail")}
            </Button>
          </div>

          <section className="space-y-3 rounded-xl border border-border bg-background/60 p-4">
            <div>
              <h4 className="text-sm font-semibold tracking-tight">
                {t("qaSectionTitle")}
              </h4>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("qaSectionSub")}
              </p>
            </div>
            {editQuestion.trim() && !editAnswer.trim() ? (
              <p className="text-sm font-medium text-destructive">
                {t("answerRequiredHint")}
              </p>
            ) : null}
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">{t("userQuestionLabel")}</span>
              <textarea
                className={cn(detailInputClass, "min-h-20 py-2")}
                value={editQuestion}
                onChange={(e) => setEditQuestion(e.target.value)}
                placeholder={t("userQuestionPlaceholder")}
                disabled={detailBusy}
                rows={3}
                maxLength={2000}
              />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="font-medium">{t("answerLabel")}</span>
              <textarea
                className={cn(detailInputClass, "min-h-28 py-2")}
                value={editAnswer}
                onChange={(e) => setEditAnswer(e.target.value)}
                placeholder={t("answerPlaceholder")}
                disabled={detailBusy}
                rows={4}
                maxLength={4000}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={detailBusy || !editQuestion.trim()}
                onClick={() => {
                  if (!detail?.id) return;
                  const q = editQuestion.trim();
                  if (!q) {
                    toast.error(t("needUserQuestion"));
                    return;
                  }
                  suggestQaMutation.mutate({
                    id: detail.id,
                    user_question: q,
                  });
                }}
              >
                {suggestQaMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Sparkles className="size-3.5" />
                )}
                {suggestQaMutation.isPending
                  ? t("suggestingAnswer")
                  : t("suggestAnswerCta")}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={detailBusy}
                onClick={() => {
                  if (!detail?.id) return;
                  saveQaMutation.mutate({
                    id: detail.id,
                    user_question: editQuestion,
                    answer: editAnswer,
                    is_public: detail.is_public,
                  });
                }}
              >
                {saveQaMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : null}
                {t("saveQaCta")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={detailBusy}
                onClick={() => {
                  if (!detail?.id) return;
                  publishMutation.mutate({
                    id: detail.id,
                    user_question: editQuestion,
                    answer: editAnswer,
                  });
                }}
              >
                {publishMutation.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Globe className="size-3.5" />
                )}
                {detail.is_public ? t("republishCta") : t("publishCta")}
              </Button>
            </div>
            <SkinReviewQaBlock
              questionLabel={t("fieldUserQuestion")}
              answerLabel={t("fieldAnswer")}
              userQuestion={editQuestion}
              answer={editAnswer}
            />
          </section>

          <SkinReviewAnalysisView analysis={detail.analysis} />
        </div>
      ) : null}
    </div>
  );
}

function StatusBadge({
  status,
  isPublic,
  t,
}: {
  status: string;
  isPublic: boolean;
  t: ReturnType<typeof useTranslations<"adminSkinReview">>;
}) {
  const published = status === "published" || isPublic;
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
        published
          ? "bg-[color-mix(in_oklab,var(--primary)_14%,transparent)] text-primary"
          : "bg-muted text-muted-foreground",
      )}
    >
      {published ? t("statuses.published") : t("statuses.draft")}
    </span>
  );
}
