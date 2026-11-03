"use client";

import { useTranslations } from "next-intl";

import type { BeDaView } from "@/lib/mascot/model";
import { cn } from "@/lib/utils";

/** Bar from API `glow_progress`, plus the near-level line. No counts. */
export function BeDaGlowNote({
  view,
  celebrate = false,
  className,
}: {
  view: BeDaView;
  celebrate?: boolean;
  className?: string;
}) {
  const t = useTranslations("mascot");
  const progress = view.glowProgress;
  if (!celebrate && progress == null && !view.nearLevelUp) return null;
  const pct = progress == null ? 0 : Math.round(progress * 100);
  return (
    <div className={cn("mt-1 w-full space-y-1", className)}>
      {celebrate ? (
        <p
          className="text-balance text-center text-[11px] font-semibold leading-tight text-rose-900"
          role="status"
          data-testid="be-da-glow-level-up"
        >
          {t("glowLevelUp")}
        </p>
      ) : null}
      {progress != null ? (
        <div
          className="h-1.5 overflow-hidden rounded-full bg-rose-100"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={t("glowProgress")}
          data-testid="be-da-glow-progress"
        >
          <div className="h-full rounded-full bg-rose-400" style={{ width: `${pct}%` }} />
        </div>
      ) : null}
      {view.nearLevelUp ? (
        <p className="text-balance text-center text-[10px] leading-tight text-rose-900/80" data-testid="be-da-glow-near">
          {t("glowNear")}
        </p>
      ) : null}
    </div>
  );
}
