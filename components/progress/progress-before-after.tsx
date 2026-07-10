"use client";

import { ArrowRight, Camera } from "lucide-react";
import { useTranslations } from "next-intl";

import { ProgressPhoto } from "@/components/progress/progress-photo";
import { Card, CardContent } from "@/components/ui/card";
import type { ProgressEntryDTO } from "@/lib/types/progress";

/** Before-After card — first entry in the range on the left, latest on the right.
 *
 *  Why side-by-side instead of a swipe-slider for v1?
 *  - Side-by-side reads instantly on mobile and desktop with zero JS interaction.
 *  - A slider implies "guess the line" but progress photos vary in lighting/angle
 *    so the user would mostly drag back and forth without insight.
 *  - We can always add a drag-comparator later without rewriting the layout. */
export function ProgressBeforeAfter({
  before,
  after,
}: {
  before: ProgressEntryDTO;
  after: ProgressEntryDTO;
}) {
  const t = useTranslations("progress.beforeAfter");
  const beforeURL = pickThumbnail(before);
  const afterURL = pickThumbnail(after);
  if (!beforeURL || !afterURL) {
    return null; // graceful fallback when either side has no photo
  }
  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-center gap-2">
          <Camera className="size-4 text-primary" aria-hidden />
          <h3 className="text-sm font-semibold tracking-tight">{t("title")}</h3>
        </div>
        <p className="text-xs text-muted-foreground">{t("hint")}</p>
        <div className="grid grid-cols-2 gap-3">
          <PhotoSlot
            label={t("before")}
            date={before.check_date}
            score={before.gauges?.overall}
            url={beforeURL}
          />
          <PhotoSlot
            label={t("after")}
            date={after.check_date}
            score={after.gauges?.overall}
            url={afterURL}
            highlight
          />
        </div>
        {before.gauges?.overall != null && after.gauges?.overall != null ? (
          <DeltaRow before={before.gauges.overall} after={after.gauges.overall} />
        ) : null}
      </CardContent>
    </Card>
  );
}

function PhotoSlot({
  label,
  date,
  score,
  url,
  highlight,
}: {
  label: string;
  date: string;
  score?: number;
  url: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl border bg-muted shadow-sm ${highlight ? "ring-2 ring-primary/30" : "ring-1 ring-transparent"}`}
    >
      <div className="relative aspect-square w-full">
        <ProgressPhoto url={url} alt={`${label} · ${date}`} />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent px-2 py-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/90">{label}</p>
        <p className="text-[11px] text-white">{date}</p>
      </div>
      {score != null ? (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-background/85 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground shadow-sm backdrop-blur">
          {Math.round(score * 100)}%
        </span>
      ) : null}
    </div>
  );
}

function DeltaRow({ before, after }: { before: number; after: number }) {
  const t = useTranslations("progress.beforeAfter");
  const delta = after - before;
  const pct = Math.round(delta * 100);
  const sign = pct > 0 ? "+" : "";
  const tone =
    pct > 3
      ? "text-emerald-700 dark:text-emerald-300"
      : pct < -3
        ? "text-amber-700 dark:text-amber-300"
        : "text-muted-foreground";
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs">
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        {Math.round(before * 100)}%
        <ArrowRight className="size-3" aria-hidden />
        {Math.round(after * 100)}%
      </span>
      <span className={`font-semibold tabular-nums ${tone}`}>{t("delta", { d: `${sign}${pct}` })}</span>
    </div>
  );
}

function pickThumbnail(entry: ProgressEntryDTO): string | null {
  return entry.image_urls?.[0] ?? null;
}
