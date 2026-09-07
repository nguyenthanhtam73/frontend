"use client";

import { CameraOff, ImageOff } from "lucide-react";
import { useTranslations } from "next-intl";

import type { CoachEvidenceChip, CoachPhotoEvidenceKind } from "@/lib/check-in/coach-evidence";

const CHIP_KEY = {
  skip: "chipSkip",
  limited: "chipLimited",
  tags_only: "chipTagsOnly",
  retake: "chipRetake",
  not_certain: "chipNotCertain",
} as const;

/**
 * Amber banner + uncertainty chips when the check-in photo was skipped
 * or too weak to read — so the coach card does not look like a sure exam.
 */
export function CoachPhotoEvidenceBanner({
  kind,
  chips,
}: {
  kind: Exclude<CoachPhotoEvidenceKind, "ok">;
  chips: CoachEvidenceChip[];
}) {
  const t = useTranslations("checkIn.coach");
  const skip = kind === "skip";
  return (
    <div
      className="rounded-xl border border-amber-500/35 bg-amber-500/[0.07] px-3.5 py-3"
      data-testid="coach-photo-evidence"
      data-evidence={kind}
      role="status"
    >
      <div className="flex items-start gap-2.5">
        <span
          className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-900 dark:text-amber-100"
          aria-hidden
        >
          {skip ? <ImageOff className="size-4" /> : <CameraOff className="size-4" />}
        </span>
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-semibold text-amber-950 dark:text-amber-50">
            {skip ? t("photoEvidenceSkipTitle") : t("photoEvidenceLimitedTitle")}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {skip ? t("photoEvidenceSkipBody") : t("photoEvidenceLimitedBody")}
          </p>
          {chips.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5 pt-0.5" data-testid="coach-uncertainty-chips">
              {chips.map((chip) => (
                <li
                  key={chip}
                  className="inline-flex items-center rounded-full border border-amber-500/30 bg-background/70 px-2.5 py-0.5 text-[11px] font-medium text-amber-950 dark:text-amber-100"
                >
                  {t(CHIP_KEY[chip])}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
