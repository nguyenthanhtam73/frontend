"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { OnboardingSkinAnalyzeDTO } from "@/lib/types/onboarding-ai";

const REGION_IDS = [
  "cheeks",
  "t_zone",
  "forehead",
  "nose",
  "chin",
  "jaw",
  "perioral",
  "temples",
] as const;

const CONCERN_TYPE_IDS = [
  "inflammatory_acne",
  "comedones",
  "pih",
  "redness_irritation",
  "wrinkles",
  "dry_lips",
  "oiliness",
  "dryness",
  "large_pores",
  "uneven_tone",
  "texture",
] as const;

function labelOrRaw(
  t: ReturnType<typeof useTranslations<"onboarding">>,
  prefix: string,
  id: string,
  known: readonly string[],
): string {
  if ((known as readonly string[]).includes(id)) {
    try {
      return t(`${prefix}.${id}` as "skinReadback.regions.cheeks");
    } catch {
      return id;
    }
  }
  return id;
}

export function OnboardingSkinReadback({
  snapshot,
  title,
  compact,
}: {
  snapshot: OnboardingSkinAnalyzeDTO;
  title?: string;
  /** Compact = summary + chips only (for Step 2 above AM/PM). */
  compact?: boolean;
}) {
  const t = useTranslations("onboarding");
  const severity = snapshot.severity_level?.trim() || "";
  const phase = snapshot.phase?.trim() || "";
  const summary = snapshot.summary?.trim() || "";
  const regions = snapshot.primary_regions ?? [];
  const concernTypes = snapshot.concern_types ?? [];

  if (!severity && !phase && !summary && regions.length === 0 && concernTypes.length === 0) {
    return null;
  }

  const severityLabel =
    severity === "mild" || severity === "moderate" || severity === "dense"
      ? t(`skinReadback.severity.${severity}`)
      : severity;
  const phaseLabel =
    phase === "calm_first" || phase === "can_add_active"
      ? t(`skinReadback.phase.${phase}`)
      : phase;

  return (
    <section
      className={cn(
        "space-y-3 rounded-xl border border-primary/25 bg-primary/[0.04] p-3.5 sm:p-4",
        compact && "space-y-2 p-3",
      )}
      data-testid="onboarding-skin-readback"
      aria-label={title ?? t("skinReadback.title")}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
        <p className="text-sm font-semibold">{title ?? t("skinReadback.title")}</p>
      </div>

      {(severity || phase) && (
        <div className="flex flex-wrap gap-1.5">
          {severity ? (
            <span
              className={cn(
                "inline-flex min-h-7 items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                severity === "dense"
                  ? "border-rose-500/35 bg-rose-500/10 text-rose-800 dark:text-rose-200"
                  : severity === "moderate"
                    ? "border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                    : "border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
              )}
              data-testid="onboarding-severity"
            >
              {t("skinReadback.severityLabel")}: {severityLabel}
            </span>
          ) : null}
          {phase ? (
            <span
              className="inline-flex min-h-7 items-center rounded-full border border-primary/30 bg-primary/8 px-2.5 py-0.5 text-xs font-semibold text-primary"
              data-testid="onboarding-phase"
            >
              {t("skinReadback.phaseLabel")}: {phaseLabel}
            </span>
          ) : null}
        </div>
      )}

      {summary ? (
        <p
          className="text-sm font-medium leading-snug text-foreground"
          data-testid="onboarding-summary"
        >
          {summary}
        </p>
      ) : null}

      {!compact && regions.length > 0 ? (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("skinReadback.regionsLabel")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {regions.map((id) => (
              <span
                key={id}
                className="rounded-full border border-border/70 bg-background px-2.5 py-0.5 text-xs"
              >
                {labelOrRaw(t, "skinReadback.regions", id, REGION_IDS)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {!compact && concernTypes.length > 0 ? (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("skinReadback.concernTypesLabel")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {concernTypes.map((id) => (
              <span
                key={id}
                className="rounded-full border border-border/70 bg-muted/30 px-2.5 py-0.5 text-xs"
              >
                {labelOrRaw(t, "skinReadback.concernTypes", id, CONCERN_TYPE_IDS)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {compact && (regions.length > 0 || concernTypes.length > 0) ? (
        <div className="flex flex-wrap gap-1.5">
          {regions.slice(0, 3).map((id) => (
            <span
              key={`r-${id}`}
              className="rounded-full border border-border/70 bg-background px-2 py-0.5 text-[11px]"
            >
              {labelOrRaw(t, "skinReadback.regions", id, REGION_IDS)}
            </span>
          ))}
          {concernTypes.slice(0, 2).map((id) => (
            <span
              key={`c-${id}`}
              className="rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[11px]"
            >
              {labelOrRaw(t, "skinReadback.concernTypes", id, CONCERN_TYPE_IDS)}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
