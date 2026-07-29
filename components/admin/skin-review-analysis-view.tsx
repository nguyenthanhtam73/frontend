"use client";

import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import type { AdminSkinReviewAnalysis } from "@/lib/types/admin-skin-review";
import { cn } from "@/lib/utils";

const REGION_KEYS = new Set([
  "forehead",
  "cheeks",
  "nose",
  "chin",
  "t_zone",
  "jawline",
  "under_eyes",
  "other",
]);

const CONCERN_KEYS = new Set([
  "none",
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
]);

const SEVERITY_KEYS = new Set(["mild", "moderate", "pronounced", "clear"]);
const SKIN_TYPE_KEYS = new Set([
  "oily",
  "dry",
  "combination",
  "normal",
  "sensitive",
  "unclear",
]);

function labelFromMap(
  t: ReturnType<typeof useTranslations<"adminSkinReview">>,
  prefix: "skinTypes" | "severities" | "concerns" | "regions",
  v: string,
  allowed: Set<string>,
): string {
  const key = v?.trim();
  if (!key) return "—";
  if (!allowed.has(key)) return key;
  return t(`${prefix}.${key}` as Parameters<typeof t>[0]);
}

/** Shared 5-section observations panel (admin + public share). */
export function SkinReviewAnalysisView({
  analysis,
  className,
  variant = "default",
}: {
  analysis: AdminSkinReviewAnalysis;
  className?: string;
  variant?: "default" | "share";
}) {
  const t = useTranslations("adminSkinReview");
  const a = analysis;
  const share = variant === "share";
  const skinTypeLabel = labelFromMap(t, "skinTypes", a.skin_type, SKIN_TYPE_KEYS);
  const severityLabel = labelFromMap(
    t,
    "severities",
    a.skin_type_severity,
    SEVERITY_KEYS,
  );

  return (
    <div className={cn(share ? "space-y-7" : "space-y-6", className)}>
      <ResultSection title={t("fieldOverview")} share={share} index={1}>
        <p
          className={cn(
            "whitespace-pre-wrap leading-relaxed text-foreground/90",
            share ? "text-base sm:text-[1.05rem]" : "text-sm",
          )}
        >
          {a.overview?.trim() || "—"}
        </p>
      </ResultSection>

      <ResultSection title={t("fieldSkinType")} share={share} index={2}>
        <div className="flex flex-wrap gap-2">
          <BadgeChip tone="teal">{skinTypeLabel}</BadgeChip>
          <BadgeChip tone="blush">{severityLabel}</BadgeChip>
        </div>
        {a.skin_type_note?.trim() ? (
          <p
            className={cn(
              "mt-2 whitespace-pre-wrap leading-relaxed text-muted-foreground",
              share ? "text-sm sm:text-[0.95rem]" : "text-sm",
            )}
          >
            {a.skin_type_note}
          </p>
        ) : null}
      </ResultSection>

      <ResultSection title={t("fieldAttention")} share={share} index={3}>
        {a.attention_areas?.length ? (
          <ul className={cn("space-y-2.5", share && "space-y-3")}>
            {a.attention_areas.map((area, i) => (
              <li
                key={`${area.region}-${area.concern}-${i}`}
                className={cn(
                  "rounded-2xl border px-3.5 py-3 text-sm",
                  share
                    ? "border-primary/15 bg-[color-mix(in_oklab,var(--primary)_5%,var(--background))]"
                    : "border-border bg-background",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold tracking-tight">
                    {labelFromMap(t, "regions", area.region, REGION_KEYS)}
                  </span>
                  <BadgeChip>
                    {labelFromMap(t, "concerns", area.concern, CONCERN_KEYS)}
                  </BadgeChip>
                  <BadgeChip tone="muted">
                    {labelFromMap(t, "severities", area.severity, SEVERITY_KEYS)}
                  </BadgeChip>
                </div>
                {area.note?.trim() ? (
                  <p className="mt-1.5 whitespace-pre-wrap leading-relaxed text-muted-foreground">
                    {area.note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t("noAttentionAreas")}</p>
        )}
      </ResultSection>

      <ResultSection title={t("fieldAdditional")} share={share} index={4}>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {a.additional_observations?.trim() || t("noAdditional")}
        </p>
      </ResultSection>

      <ResultSection title={t("fieldPhotoNotes")} share={share} index={5}>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
          {a.photo_notes?.trim() || "—"}
        </p>
      </ResultSection>

      {a.non_diagnostic ? (
        <p className="border-t border-border/60 pt-4 text-xs leading-relaxed text-muted-foreground">
          {a.non_diagnostic}
        </p>
      ) : null}
    </div>
  );
}

function ResultSection({
  title,
  children,
  share,
  index,
}: {
  title: string;
  children: ReactNode;
  share?: boolean;
  index?: number;
}) {
  return (
    <div className={cn("space-y-2.5", share && "space-y-3")}>
      <h3
        className={cn(
          "flex items-center gap-2 font-semibold tracking-tight",
          share ? "text-[0.95rem]" : "text-sm",
        )}
      >
        {share && index != null ? (
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary/12 text-[11px] font-bold text-primary">
            {index}
          </span>
        ) : null}
        {title}
      </h3>
      {children}
    </div>
  );
}

function BadgeChip({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: "default" | "muted" | "teal" | "blush";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "muted" && "bg-muted text-muted-foreground",
        tone === "default" && "bg-foreground/10 text-foreground",
        tone === "teal" &&
          "bg-[color-mix(in_oklab,var(--primary)_16%,transparent)] text-primary",
        tone === "blush" &&
          "bg-[color-mix(in_oklab,var(--accent)_80%,transparent)] text-accent-foreground",
      )}
    >
      {children}
    </span>
  );
}
