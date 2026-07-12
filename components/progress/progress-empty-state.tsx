"use client";

import { CalendarRange, Camera, Images, LineChart, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent } from "@/components/ui/card";

/** Two flavours of empty state:
 *  - "first": the user has never checked in anywhere → full motivational pitch.
 *  - "range": the user HAS history, just nothing inside the current range →
 *    lighter nudge + a shortcut to widen the range to "all".
 *
 *  The distinction is decided upstream in `ProgressTimeline` (which knows whether
 *  any check-in exists at all); this component only renders the copy + preview. */
export function ProgressEmptyState({
  mode,
  onViewAll,
}: {
  mode: "first" | "range";
  /** Called by the "range" variant to jump the filter to all-time. */
  onViewAll?: () => void;
}) {
  const t = useTranslations("progress.empty");
  const isFirst = mode === "first";

  return (
    <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-primary/10 via-accent/40 to-background">
      {/* soft decorative glow */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />
      <CardContent className="relative space-y-5 py-8 text-center sm:py-10">
        <div className="space-y-3">
          <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-background/80 shadow-sm ring-1 ring-primary/20">
            {isFirst ? (
              <Camera className="size-5 text-primary" aria-hidden />
            ) : (
              <CalendarRange className="size-5 text-primary" aria-hidden />
            )}
          </span>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
              {isFirst ? t("first.title") : t("range.title")}
            </h2>
            <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
              {isFirst ? t("first.body") : t("range.body")}
            </p>
          </div>
        </div>

        {/* Level 2.2 — non-interactive preview so users can picture the payoff. */}
        <PreviewTiles />

        {/* Level 2.1 — the "why bother" benefit line. */}
        <p className="mx-auto max-w-md text-xs leading-relaxed text-muted-foreground/90">
          {t("benefit")}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2">
          <ButtonLink href="/check-in" size="lg" className="gap-1.5">
            <Sparkles className="size-4" aria-hidden />
            {t("cta")}
          </ButtonLink>
          {/* Only offer "view all" when there IS older history to reveal. */}
          {!isFirst && onViewAll ? (
            <Button type="button" variant="outline" size="lg" onClick={onViewAll}>
              {t("range.viewAll")}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

/** Three faded, non-interactive tiles previewing the real Progress widgets. */
function PreviewTiles() {
  const t = useTranslations("progress.empty.preview");
  return (
    <div className="mx-auto max-w-md space-y-1.5" aria-hidden>
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
        {t("label")}
      </p>
      <div className="grid grid-cols-3 gap-2 opacity-70">
        <PreviewTile
          icon={<span className="text-sm">🔥</span>}
          value={t("streakValue")}
          label={t("streakLabel")}
        />
        <PreviewTile
          icon={<LineChart className="size-3.5 text-primary/70" />}
          value={t("overallValue")}
          label={t("overallLabel")}
        />
        <PreviewTile
          icon={<Images className="size-3.5 text-primary/70" />}
          value={t("beforeAfterValue")}
          label={t("beforeAfterLabel")}
        />
      </div>
    </div>
  );
}

function PreviewTile({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border/70 bg-background/50 px-2 py-2.5">
      <div className="flex items-center justify-center gap-1 text-xs font-semibold tabular-nums text-foreground/80">
        {icon}
        <span className="truncate">{value}</span>
      </div>
      <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
