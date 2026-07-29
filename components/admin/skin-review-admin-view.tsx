"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import {
  AdminSkinReviewUpload,
  type AdminReviewPhoto,
} from "@/components/admin/admin-skin-review-upload";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/i18n/navigation";
import {
  createAdminSkinReview,
  patchAdminSkinReview,
} from "@/lib/api/admin-skin-review";
import { apiBaseUrl } from "@/lib/api";
import { useAdminGate } from "@/lib/hooks/use-admin-gate";
import type {
  AdminSkinReviewResponse,
  AdminSkinReviewStatus,
} from "@/lib/types/admin-skin-review";
import { cn } from "@/lib/utils";

const inputClass =
  "min-h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const selectClass =
  "min-h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function resolveImageUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/uploads/")) return `${apiBaseUrl}${path}`;
  return path;
}

function labelSkinType(t: ReturnType<typeof useTranslations>, v: string): string {
  const key = `skinTypes.${v}` as Parameters<typeof t>[0];
  try {
    return t(key);
  } catch {
    return v;
  }
}

function labelSeverity(t: ReturnType<typeof useTranslations>, v: string): string {
  const key = `severities.${v}` as Parameters<typeof t>[0];
  try {
    return t(key);
  } catch {
    return v;
  }
}

function labelConcern(t: ReturnType<typeof useTranslations>, v: string): string {
  const key = `concerns.${v}` as Parameters<typeof t>[0];
  try {
    return t(key);
  } catch {
    return v;
  }
}

/** Admin Skin Review console: upload → Premium vision → observations-only result. */
export function SkinReviewAdminView() {
  const t = useTranslations("adminSkinReview");
  const locale = useLocale();
  const toast = useToast();
  const { hasAuth, isAdmin, authPending } = useAdminGate();

  const [photos, setPhotos] = useState<AdminReviewPhoto[]>([]);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<AdminSkinReviewStatus>("draft");
  const [result, setResult] = useState<AdminSkinReviewResponse | null>(null);

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
        status,
      }),
    onSuccess: (res) => {
      setResult(res);
      toast.success(t("analyzeSuccess"));
    },
    onError: (err) => {
      const msg =
        err instanceof Error && err.message === "forbidden"
          ? t("forbidden")
          : err instanceof Error && err.message === "auth"
            ? t("needAuth")
            : t("analyzeError");
      toast.error(msg);
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!result?.id) throw new Error("missing_id");
      return patchAdminSkinReview(result.id, { title, notes, status });
    },
    onSuccess: (res) => {
      setResult(res);
      toast.success(t("saveSuccess"));
    },
    onError: () => {
      toast.error(t("saveError"));
    },
  });

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

  if (!isAdmin) {
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

  return (
    <div className="space-y-8">
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
      </section>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={analyzing || photos.length < 1}
          onClick={() => analyzeMutation.mutate()}
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
            disabled={saving || analyzing}
            onClick={() => saveMutation.mutate()}
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {t("saveMetaCta")}
          </Button>
        ) : null}
        {result ? (
          <Button
            type="button"
            variant="ghost"
            disabled={analyzing}
            onClick={() => {
              photos.forEach((p) => URL.revokeObjectURL(p.url));
              setPhotos([]);
              setResult(null);
              setTitle("");
              setNotes("");
              setStatus("draft");
            }}
          >
            {t("resetCta")}
          </Button>
        ) : null}
      </div>

      {result ? (
        <SkinReviewResultPanel result={result} t={t} />
      ) : null}
    </div>
  );
}

function SkinReviewResultPanel({
  result,
  t,
}: {
  result: AdminSkinReviewResponse;
  t: ReturnType<typeof useTranslations<"adminSkinReview">>;
}) {
  const a = result.analysis;

  return (
    <section className="space-y-5 rounded-2xl border border-border bg-muted/30 p-5 sm:p-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{t("stepResult")}</h2>
        <p className="text-xs text-muted-foreground">
          {t("resultMeta", { id: result.id, model: result.model_used || "—" })}
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

      <ResultBlock title={t("fieldOverview")} body={a.overview} />

      <div className="grid gap-3 sm:grid-cols-2">
        <MetaChip label={t("fieldSkinType")} value={labelSkinType(t, a.skin_type)} />
        <MetaChip
          label={t("fieldSeverity")}
          value={labelSeverity(t, a.overall_severity)}
        />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">{t("fieldAttention")}</h3>
        {a.attention_areas?.length ? (
          <ul className="space-y-2">
            {a.attention_areas.map((area, i) => (
              <li
                key={`${area.region}-${area.concern}-${i}`}
                className="rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
              >
                <p className="font-medium">
                  {area.region || "—"} · {labelConcern(t, area.concern)} ·{" "}
                  {labelSeverity(t, area.severity)}
                </p>
                {area.note ? (
                  <p className="mt-1 text-muted-foreground">{area.note}</p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noAttentionAreas")}</p>
        )}
      </div>

      <ResultBlock title={t("fieldDetailed")} body={a.detailed_findings} />
      <ResultBlock title={t("fieldExtra")} body={a.extra_notes} />

      {a.non_diagnostic ? (
        <p className="text-xs text-muted-foreground">{a.non_diagnostic}</p>
      ) : null}
    </section>
  );
}

function ResultBlock({ title, body }: { title: string; body?: string }) {
  if (!body?.trim()) return null;
  return (
    <div>
      <h3 className="mb-1.5 text-sm font-semibold">{title}</h3>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
        {body}
      </p>
    </div>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background px-3 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium">{value}</p>
    </div>
  );
}
