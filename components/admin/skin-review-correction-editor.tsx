"use client";

import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { patchAdminSkinReview } from "@/lib/api/admin-skin-review";
import type {
  AdminSkinReviewAnalysis,
  AdminSkinReviewResponse,
} from "@/lib/types/admin-skin-review";
import { cn } from "@/lib/utils";

/**
 * Operator correction of the AI read.
 *
 * Reviewing already means judging whether the group is right — before this existed that
 * judgement was thrown away and the only option was to re-roll the model. Saving it keeps
 * the (AI answer, corrected answer) pair as labeled data for measuring accuracy.
 */

const CONCERN_OPTIONS = [
  "none",
  "not_visible",
  "acne",
  "papules",
  "pustules",
  "redness",
  "pigmentation",
  "dark_spots",
  "pores",
  "dryness",
  "oiliness",
  "texture",
  "irritation",
  "other",
] as const;

const SEVERITY_OPTIONS = ["mild", "moderate", "pronounced", "clear"] as const;

const selectClass =
  "h-9 rounded-lg border border-border bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function SkinReviewCorrectionEditor({
  review,
  onSaved,
  className,
}: {
  review: AdminSkinReviewResponse;
  onSaved?: (next: AdminSkinReviewResponse) => void;
  className?: string;
}) {
  const t = useTranslations("adminSkinReview");
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<AdminSkinReviewAnalysis>(review.analysis);

  const mutation = useMutation({
    mutationFn: () => patchAdminSkinReview(review.id, { analysis: draft }),
    onSuccess: (next) => {
      toast.success(t("correctionSaved"));
      setDraft(next.analysis);
      setOpen(false);
      onSaved?.(next);
    },
    onError: () => {
      toast.error(t("correctionError"));
    },
  });

  if (!open) {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setDraft(review.analysis);
            setOpen(true);
          }}
        >
          {t("correctionCta")}
        </Button>
        {review.analysis_corrected ? (
          <span className="text-xs text-muted-foreground">{t("correctionDone")}</span>
        ) : (
          <span className="text-xs text-muted-foreground">{t("correctionHint")}</span>
        )}
      </div>
    );
  }

  const areas = draft.attention_areas ?? [];

  return (
    <section
      className={cn("space-y-3 rounded-2xl border border-border bg-background p-3.5", className)}
      data-testid="skin-review-correction-editor"
    >
      <div className="space-y-1">
        <p className="text-sm font-semibold">{t("correctionTitle")}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("correctionWhy")}
        </p>
      </div>

      <ul className="space-y-2">
        {areas.map((area, i) => (
          <li
            key={`${area.region}-${i}`}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-muted/20 px-2.5 py-2"
          >
            <span className="min-w-16 text-xs font-semibold">{area.region}</span>
            <select
              className={selectClass}
              value={area.concern}
              aria-label={t("correctionConcernLabel")}
              onChange={(e) => {
                const next = [...areas];
                next[i] = { ...area, concern: e.target.value };
                setDraft({ ...draft, attention_areas: next });
              }}
            >
              {CONCERN_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={area.severity}
              aria-label={t("correctionSeverityLabel")}
              onChange={(e) => {
                const next = [...areas];
                next[i] = { ...area, severity: e.target.value };
                setDraft({ ...draft, attention_areas: next });
              }}
            >
              {SEVERITY_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>

      <label className="block space-y-1.5 text-sm">
        <span className="font-medium">{t("correctionOverviewLabel")}</span>
        <textarea
          className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={draft.overview}
          onChange={(e) => setDraft({ ...draft, overview: e.target.value })}
          rows={4}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={mutation.isPending || !draft.overview.trim()}
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("correctionSave")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={mutation.isPending}
          onClick={() => {
            setDraft(review.analysis);
            setOpen(false);
          }}
        >
          {t("correctionCancel")}
        </Button>
      </div>
    </section>
  );
}
