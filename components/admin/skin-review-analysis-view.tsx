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
    <div className={cn(share ? "space-y-8 sm:space-y-7" : "space-y-6", className)}>
      <ResultSection title={t("fieldOverview")} share={share} index={1}>
        <p
          className={cn(
            "min-w-0 break-words whitespace-pre-wrap text-foreground/90",
            share
              ? "text-[0.9875rem] leading-[1.65] sm:text-[1.05rem] sm:leading-relaxed"
              : "text-sm leading-relaxed",
          )}
        >
          {a.overview?.trim() || "—"}
        </p>
      </ResultSection>

      <ResultSection title={t("fieldSkinType")} share={share} index={2}>
        <div className="flex flex-wrap gap-2">
          <BadgeChip tone="teal" share={share}>
            {skinTypeLabel}
          </BadgeChip>
          <BadgeChip tone="blush" share={share}>
            {severityLabel}
          </BadgeChip>
        </div>
        {a.skin_type_note?.trim() ? (
          <p
            className={cn(
              "mt-2.5 min-w-0 break-words whitespace-pre-wrap leading-relaxed text-muted-foreground",
              share ? "text-[0.9375rem] sm:text-[0.95rem]" : "text-sm",
            )}
          >
            {a.skin_type_note}
          </p>
        ) : null}
      </ResultSection>

      <ResultSection title={t("fieldAttention")} share={share} index={3}>
        {a.attention_areas?.length ? (
          <ul className={cn("space-y-2.5", share && "space-y-3.5")}>
            {a.attention_areas.map((area, i) => (
              <li
                key={`${area.region}-${area.concern}-${i}`}
                className={cn(
                  "min-w-0 rounded-2xl border",
                  share
                    ? "border-primary/15 bg-[color-mix(in_oklab,var(--primary)_5%,var(--background))] px-3.5 py-3.5 sm:px-4 sm:py-3.5"
                    : "border-border bg-background px-3.5 py-3 text-sm",
                )}
              >
                <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
                  <span
                    className={cn(
                      "font-semibold tracking-tight",
                      share ? "text-[0.9375rem] sm:text-sm" : "text-sm",
                    )}
                  >
                    {labelFromMap(t, "regions", area.region, REGION_KEYS)}
                  </span>
                  <BadgeChip share={share}>
                    {labelFromMap(t, "concerns", area.concern, CONCERN_KEYS)}
                  </BadgeChip>
                  <BadgeChip tone="muted" share={share}>
                    {labelFromMap(t, "severities", area.severity, SEVERITY_KEYS)}
                  </BadgeChip>
                </div>
                {area.note?.trim() ? (
                  <p
                    className={cn(
                      "mt-2 min-w-0 break-words whitespace-pre-wrap leading-relaxed text-muted-foreground",
                      share ? "text-[0.9375rem]" : "mt-1.5 text-sm",
                    )}
                  >
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
        <p
          className={cn(
            "min-w-0 break-words whitespace-pre-wrap leading-relaxed text-foreground/90",
            share ? "text-[0.9375rem] sm:text-sm" : "text-sm",
          )}
        >
          {a.additional_observations?.trim() || t("noAdditional")}
        </p>
      </ResultSection>

      <ResultSection title={t("fieldPhotoNotes")} share={share} index={5}>
        <p
          className={cn(
            "min-w-0 break-words whitespace-pre-wrap leading-relaxed text-foreground/90",
            share ? "text-[0.9375rem] sm:text-sm" : "text-sm",
          )}
        >
          {a.photo_notes?.trim() || "—"}
        </p>
      </ResultSection>

      {a.non_diagnostic ? (
        <p
          className={cn(
            "border-t border-border/60 pt-4 leading-relaxed text-muted-foreground",
            share ? "text-[0.8125rem] sm:text-xs" : "text-xs",
          )}
        >
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
    <section className={cn("min-w-0 space-y-2.5", share && "space-y-3")}>
      <h3
        className={cn(
          "flex min-w-0 items-center gap-2.5 font-semibold tracking-tight",
          share ? "text-[1rem] sm:text-[0.95rem]" : "text-sm",
        )}
      >
        {share && index != null ? (
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-bold text-primary sm:size-6 sm:text-[11px]">
            {index}
          </span>
        ) : null}
        <span className="min-w-0 text-balance">{title}</span>
      </h3>
      {children}
    </section>
  );
}

function BadgeChip({
  children,
  tone = "default",
  share,
}: {
  children: ReactNode;
  tone?: "default" | "muted" | "teal" | "blush";
  share?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center rounded-full font-medium break-words",
        share
          ? "px-2.5 py-1.5 text-[0.8125rem] leading-snug sm:px-2.5 sm:py-1 sm:text-xs"
          : "px-2.5 py-1 text-xs",
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
