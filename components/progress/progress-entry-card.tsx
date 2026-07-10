"use client";

import { Clock3, Sparkles, Tag } from "lucide-react";
import { useTranslations } from "next-intl";

import { ProgressPhoto } from "@/components/progress/progress-photo";
import { Card, CardContent } from "@/components/ui/card";
import type { ProgressEntryDTO } from "@/lib/types/progress";

/** ProgressEntryCard — one row on the timeline.
 *
 *  Mobile-first layout: square thumbnail (left) + meta column (right). On wider
 *  screens the row keeps the same shape because vertically stacked content already
 *  reads well in a 3-column grid. */
export function ProgressEntryCard({ entry }: { entry: ProgressEntryDTO }) {
  const t = useTranslations("progress.entry");
  const thumb = entry.image_urls?.[0];
  const photoCount = entry.image_urls?.length ?? 0;
  const overall = entry.gauges?.overall;

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <div className="flex gap-3 p-3 sm:gap-4 sm:p-4">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-muted shadow-sm sm:size-24">
          {thumb ? (
            <ProgressPhoto
              url={thumb}
              alt={`${entry.title?.trim() || t("untitled")} — ${entry.check_date}`}
            />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-muted-foreground">—</div>
          )}
          {photoCount > 1 ? (
            <span className="absolute bottom-1 left-1 rounded-full bg-background/80 px-1.5 py-0.5 text-[9px] font-semibold text-foreground shadow-sm backdrop-blur">
              {t("photoCount", { n: photoCount })}
            </span>
          ) : null}
          {overall != null ? (
            <span className="absolute right-1 top-1 rounded-full bg-background/85 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-foreground shadow-sm backdrop-blur">
              {Math.round(overall * 100)}%
            </span>
          ) : null}
        </div>

        <CardContent className="flex min-w-0 flex-1 flex-col gap-1.5 p-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold tracking-tight">
              {entry.title?.trim() || t("untitled")}
            </p>
            <span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-muted-foreground">
              <Clock3 className="size-3" aria-hidden />
              {entry.check_date}
            </span>
          </div>

          {entry.snippet ? (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              <Sparkles className="mr-1 inline size-3 text-primary" aria-hidden />
              {entry.snippet}
            </p>
          ) : entry.status === "pending" || entry.status === "processing" ? (
            <p className="text-xs italic text-muted-foreground">{t("processing")}</p>
          ) : entry.status === "failed" ? (
            <p className="text-xs text-destructive/80">{t("failed")}</p>
          ) : entry.user_note ? (
            <p className="line-clamp-2 text-xs text-muted-foreground sm:text-sm">{entry.user_note}</p>
          ) : null}

          {entry.tags && entry.tags.length > 0 ? (
            <div className="mt-0.5 flex flex-wrap items-center gap-1">
              <Tag className="size-3 text-muted-foreground" aria-hidden />
              {entry.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {entry.tags.length > 4 ? (
                <span className="text-[10px] text-muted-foreground">+{entry.tags.length - 4}</span>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </div>
    </Card>
  );
}
