"use client";

import { useMutation } from "@tanstack/react-query";
import { Check, Copy, Globe, Loader2, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  AdminSkinReviewUpload,
  type AdminReviewPhoto,
} from "@/components/admin/admin-skin-review-upload";
import { SkinReviewAdminList } from "@/components/admin/skin-review-admin-list";
import { SkinReviewAnalysisView } from "@/components/admin/skin-review-analysis-view";
import { SkinReviewQaBlock } from "@/components/share/skin-review-qa-block";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/i18n/navigation";
import { apiBaseUrl } from "@/lib/api";
import {
  createAdminSkinReview,
  patchAdminSkinReview,
  publishAdminSkinReview,
  skinReviewShareUrl,
  suggestAdminSkinReviewAnswer,
} from "@/lib/api/admin-skin-review";
import { useAdminGate } from "@/lib/hooks/use-admin-gate";
import type {
  AdminSkinReviewResponse,
  AdminSkinReviewStatus,
} from "@/lib/types/admin-skin-review";
import { cn } from "@/lib/utils";

type AdminTab = "create" | "list";

const inputClass =
  "min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const selectClass =
  "min-h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function resolveImageUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/uploads/")) return `${apiBaseUrl}${path}`;
  return path;
}

/** Admin Skin Review console: upload → Premium vision → observations-only result. */
export function SkinReviewAdminView() {
  const t = useTranslations("adminSkinReview");
  const locale = useLocale();
  const toast = useToast();
  const { hasAuth, canSkinReview, authPending } = useAdminGate();

  const [tab, setTab] = useState<AdminTab>("create");
  const [photos, setPhotos] = useState<AdminReviewPhoto[]>([]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [userQuestion, setUserQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState<AdminSkinReviewStatus>("draft");
  const [result, setResult] = useState<AdminSkinReviewResponse | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- revoke only on unmount
  }, []);

  const analyzeMutation = useMutation({
    mutationFn: () =>
      createAdminSkinReview({
        files: photos.map((p) => p.file),
        locale,
        title,
        notes,
        user_question: userQuestion,
        answer,
        status,
      }),
    onSuccess: (res) => {
      setResult(res);
      setUserQuestion(res.user_question ?? "");
      setAnswer(res.answer ?? "");
      toast.success(t("analyzeSuccess"));
    },
    onError: (err) => {
      const msg =
        err instanceof Error && err.message === "forbidden"
          ? t("forbidden")
          : err instanceof Error && err.message === "auth"
            ? t("needAuth")
            : err instanceof Error && err.message === "missing_images"
              ? t("needOnePhoto")
              : t("analyzeError");
      toast.error(msg);
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!result?.id) throw new Error("missing_id");
      return patchAdminSkinReview(result.id, {
        title,
        notes,
        user_question: userQuestion,
        answer,
        status,
      });
    },
    onSuccess: (res) => {
      setResult(res);
      setUserQuestion(res.user_question ?? "");
      setAnswer(res.answer ?? "");
      toast.success(t("saveSuccess"));
    },
    onError: () => {
      toast.error(t("saveError"));
    },
  });

  const suggestMutation = useMutation({
    mutationFn: () => {
      if (!result?.id) throw new Error("missing_id");
      const q = userQuestion.trim();
      if (!q) throw new Error("missing_question");
      return suggestAdminSkinReviewAnswer(result.id, { user_question: q });
    },
    onSuccess: (res) => {
      setAnswer(res.answer ?? "");
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

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!result?.id) throw new Error("missing_id");
      // Persist Q&A + meta first — suggest/answer only live in local state until PATCH.
      const saved = await patchAdminSkinReview(result.id, {
        title,
        notes,
        user_question: userQuestion,
        answer,
        status,
      });
      const published = await publishAdminSkinReview(saved.id);
      return published;
    },
    onSuccess: (res) => {
      setResult(res);
      setUserQuestion(res.user_question ?? "");
      setAnswer(res.answer ?? "");
      setStatus("published");
      toast.success(t("publishSuccess"));
    },
    onError: () => {
      toast.error(t("publishError"));
    },
  });

  async function copyShareLink() {
    if (!result?.public_slug) return;
    const url = skinReviewShareUrl(result.public_slug, locale);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success(t("copySuccess"));
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copyError"));
    }
  }

  if (authPending) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full" />
        <p className="text-sm text-muted-foreground">{t("authLoading")}</p>
      </div>
    );
  }

  if (!hasAuth) {
    return (
      <Card>
        <CardContent className="space-y-3 py-8">
          <p className="text-sm text-muted-foreground">{t("needAuth")}</p>
          <Link href="/login" className={cn(buttonVariants())}>
            {t("signIn")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (!canSkinReview) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground">{t("forbidden")}</p>
        </CardContent>
      </Card>
    );
  }

  const analyzing = analyzeMutation.isPending;
  const saving = saveMutation.isPending;
  const publishing = publishMutation.isPending;
  const suggesting = suggestMutation.isPending;
  const shareUrl =
    result?.public_slug && result.is_public
      ? skinReviewShareUrl(result.public_slug, locale)
      : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-1.5 rounded-full bg-muted/70 p-1 w-fit">
        {(
          [
            ["create", "tabCreate"],
            ["list", "tabList"],
          ] as const
        ).map(([value, key]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              tab === value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(key)}
          </button>
        ))}
      </div>

      {tab === "list" ? (
        <SkinReviewAdminList
          enabled={!authPending && hasAuth && canSkinReview}
          onOpenCreate={() => setTab("create")}
        />
      ) : null}

      {tab === "create" ? (
      <>
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t("stepUpload")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("stepUploadSub")}</p>
        </div>
        <AdminSkinReviewUpload
          photos={photos}
          onChange={setPhotos}
          disabled={analyzing}
        />
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">{t("titleLabel")}</span>
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("titlePlaceholder")}
            disabled={analyzing}
            maxLength={200}
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="font-medium">{t("statusLabel")}</span>
          <select
            className={selectClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as AdminSkinReviewStatus)}
            disabled={analyzing}
          >
            <option value="draft">{t("statuses.draft")}</option>
            <option value="published">{t("statuses.published")}</option>
          </select>
        </label>
        <label className="block space-y-1.5 text-sm sm:col-span-2">
          <span className="font-medium">{t("notesLabel")}</span>
          <textarea
            className={cn(inputClass, "min-h-24 py-2")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("notesPlaceholder")}
            disabled={analyzing}
            rows={3}
          />
        </label>
        <label className="block space-y-1.5 text-sm sm:col-span-2">
          <span className="font-medium">{t("userQuestionLabel")}</span>
          <input
            className={inputClass}
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
            placeholder={t("userQuestionPlaceholder")}
            disabled={analyzing || publishing}
            maxLength={2000}
          />
          <span className="text-xs text-muted-foreground">
            {t("userQuestionHint")}
          </span>
        </label>
      </section>

      {result ? (
        <section className="space-y-4 rounded-2xl border border-border bg-muted/20 p-4 sm:p-5">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              {t("qaSectionTitle")}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">{t("qaSectionSub")}</p>
          </div>
          <label className="block space-y-1.5 text-sm">
            <span className="font-medium">{t("answerLabel")}</span>
            <textarea
              className={cn(inputClass, "min-h-28 py-2")}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={t("answerPlaceholder")}
              disabled={analyzing || publishing || suggesting}
              rows={4}
              maxLength={4000}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={
                suggesting || analyzing || publishing || !userQuestion.trim()
              }
              onClick={() => suggestMutation.mutate()}
            >
              {suggesting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Sparkles className="size-4" />
              )}
              {suggesting ? t("suggestingAnswer") : t("suggestAnswerCta")}
            </Button>
          </div>
          <SkinReviewQaBlock
            questionLabel={t("fieldUserQuestion")}
            answerLabel={t("fieldAnswer")}
            userQuestion={userQuestion}
            answer={answer}
          />
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={analyzing}
          onClick={() => {
            if (photos.length < 1) {
              toast.error(t("needOnePhoto"));
              return;
            }
            analyzeMutation.mutate();
          }}
        >
          {analyzing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Sparkles className="size-4" />
          )}
          {analyzing ? t("analyzing") : t("analyzeCta")}
        </Button>
        {result ? (
          <Button
            type="button"
            variant="outline"
            disabled={saving || analyzing || publishing || suggesting}
            onClick={() => saveMutation.mutate()}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("saveMetaCta")}
          </Button>
        ) : null}
        {result ? (
          <Button
            type="button"
            variant="secondary"
            disabled={publishing || analyzing || saving || suggesting}
            onClick={() => publishMutation.mutate()}
          >
            {publishing ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Globe className="size-4" />
            )}
            {result.is_public ? t("republishCta") : t("publishCta")}
          </Button>
        ) : null}
        {result ? (
          <Button
            type="button"
            variant="ghost"
            disabled={analyzing || publishing}
            onClick={() => {
              photos.forEach((p) => URL.revokeObjectURL(p.url));
              setPhotos([]);
              setResult(null);
              setTitle("");
              setNotes("");
              setUserQuestion("");
              setAnswer("");
              setStatus("draft");
              setCopied(false);
            }}
          >
            {t("resetCta")}
          </Button>
        ) : null}
      </div>

      {shareUrl ? (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-1">
            <p className="text-sm font-medium">{t("shareReady")}</p>
            <p className="truncate text-xs text-muted-foreground">{shareUrl}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void copyShareLink()}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? t("copied") : t("copyLinkCta")}
            </Button>
            <a
              href={shareUrl}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              {t("openShareCta")}
            </a>
          </div>
        </div>
      ) : null}

      {result ? (
        <section className="space-y-5 rounded-2xl border border-border bg-muted/30 p-5 sm:p-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold tracking-tight">{t("stepResult")}</h2>
            <p className="text-xs text-muted-foreground">
              {t("resultMeta", {
                id: result.id,
                model: result.model_used || "—",
              })}
            </p>
          </div>

          {result.image_urls?.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {result.image_urls.map((url) => (
                <li
                  key={url}
                  className="size-20 overflow-hidden rounded-lg border border-border bg-background"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={resolveImageUrl(url)}
                    alt=""
                    className="size-full object-cover"
                  />
                </li>
              ))}
            </ul>
          ) : null}

          <SkinReviewAnalysisView analysis={result.analysis} />
        </section>
      ) : null}
      </>
      ) : null}
    </div>
  );
}
