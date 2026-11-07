"use client";

import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/**
 * Calm stand-in for a skin-check coach that is not ready yet.
 * Shown when `analysis_pending` is true or the analysis status is `failed`.
 */
export function AnalysisMaintenanceNote({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const t = useTranslations("checkIn.maintenance");

  return (
    <div
      role="status"
      data-testid="analysis-maintenance-note"
      className={cn(
        "rounded-xl border border-border/70 bg-muted/50",
        compact ? "space-y-1 px-3 py-2.5" : "space-y-1.5 px-4 py-3.5",
        className,
      )}
    >
      <p
        className={cn(
          "font-semibold tracking-tight text-foreground",
          compact ? "text-sm" : "text-base",
        )}
      >
        {t("title")}
      </p>
      <p
        className={cn(
          "leading-relaxed text-muted-foreground",
          compact ? "text-xs" : "text-sm",
        )}
      >
        {t("body")}
      </p>
    </div>
  );
}
