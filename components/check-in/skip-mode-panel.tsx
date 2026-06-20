"use client";

import { AlertCircle, Camera, ImageOff, Tags } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/** Shown instead of the photo upload card when skip-face mode is active. */
export function SkipModePanel({
  onBack,
  readyToSubmit,
}: {
  onBack: () => void;
  /** True when user picked at least one tag or wrote a note. */
  readyToSubmit: boolean;
}) {
  const t = useTranslations("checkIn");

  return (
    <div className="space-y-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-left-2 motion-safe:duration-300">
      <div
        className={cn(
          "rounded-xl border bg-linear-to-br from-primary/5 via-background to-muted/30 p-4 transition-colors duration-300",
          readyToSubmit ? "border-primary/25" : "border-primary/20",
        )}
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20"
          >
            <ImageOff className="size-5" />
          </span>
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-semibold text-foreground">
              {t("skipModeActiveTitle")}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("skipModeActiveNotice")}
            </p>
            <div
              className={cn(
                "flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-relaxed transition-colors duration-300",
                readyToSubmit
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-800 dark:text-emerald-200"
                  : "border-amber-500/25 bg-amber-500/5 text-amber-900 dark:text-amber-100",
              )}
            >
              {readyToSubmit ? (
                <Tags className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              ) : (
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              )}
              <span>
                {readyToSubmit
                  ? t("skipModeReadyHint")
                  : t("skipModeNeedTagsHint")}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            size="sm"
            onClick={onBack}
            className="min-h-11 gap-2 sm:min-h-9"
          >
            <Camera className="size-4" aria-hidden />
            {t("skipModeBackCta")}
          </Button>
          <Link
            href="/cabinet"
            className="inline-flex min-h-11 items-center justify-center rounded-md px-3 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline sm:min-h-9"
          >
            {t("skipModeManageCta")}
          </Link>
        </div>
      </div>

      {/*
        TODO(backend): POST /api/v1/skin-checks currently requires field "images"
        with at least one file (see backend/internal/handler/skin_check.go).
        When backend supports tag+notes-only check-ins, remove client-side
        workaround and send skip_mode=true (or omit images) from check-in-form.
      */}
      <p className="text-[11px] leading-relaxed text-muted-foreground/80">
        {t("skipModeBackendNote")}
      </p>
    </div>
  );
}
