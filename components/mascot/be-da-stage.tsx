"use client";

import { useTranslations } from "next-intl";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import { BeDaGlowNote } from "@/components/mascot/be-da-glow-note";
import {
  markOpacity,
  type BeDaView,
  type SkinConcern,
  type StepPose,
} from "@/lib/mascot/model";
import { cn } from "@/lib/utils";

const FILL: Record<SkinConcern, string> = {
  acne: "#F07184",
  oily: "#E7C24A",
  dark_spot: "#C49A84",
  dry: "#E7C4A4",
  red: "#FF8EAE",
};

export function BeDaStage({
  view,
  stepPose = null,
  line,
  locale,
  tidy = false,
  fliesExit = false,
  celebrate = false,
  glowCelebrate = false,
  interactive = false,
  tapLabel,
  figureClassName = "h-auto w-[148px] shrink-0",
}: {
  view: BeDaView;
  stepPose?: StepPose | null;
  line: string;
  locale: string;
  tidy?: boolean;
  fliesExit?: boolean;
  celebrate?: boolean;
  glowCelebrate?: boolean;
  interactive?: boolean;
  tapLabel?: string;
  figureClassName?: string;
}) {
  const t = useTranslations("mascot");
  return (
    <div className="flex items-start gap-2" data-testid="be-da-stage" data-mood={view.mood}>
      <div className={cn("flex shrink-0 flex-col items-center", figureClassName)}>
        <BeDaFigure
          className="w-full"
          view={view}
          stepPose={stepPose}
          locale={locale}
          tidy={tidy}
          fliesExit={fliesExit}
          celebrate={celebrate}
          glowCelebrate={glowCelebrate}
          interactive={interactive}
          tapLabel={tapLabel}
        />
        <BeDaGlowNote view={view} celebrate={glowCelebrate} />
      </div>
      <div className="min-w-0 flex-1 space-y-2 pt-1">
        <p className="rounded-2xl bg-white/85 px-3 py-2 text-sm leading-snug text-foreground shadow-sm">
          {line}
        </p>
        {view.bars.length > 0 ? (
          <ul className="space-y-1" aria-label={t("levelsLabel")}>
            {view.bars.map((bar) => (
              <li key={bar.concern} className="flex items-center gap-1.5" data-testid={`be-da-level-${bar.concern}`}>
                <span className="w-9 shrink-0 text-[11px] font-semibold text-foreground/80">
                  {t(`concerns.${bar.concern}`)}
                </span>
                <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/70">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: bar.level === "heavy" ? "100%" : bar.level === "medium" ? "64%" : bar.level === "light" ? "36%" : "0%",
                      background: FILL[bar.concern],
                      opacity: bar.level ? markOpacity(bar.level) : 0.25,
                    }}
                  />
                </span>
                {bar.improved ? (
                  <span className="shrink-0 text-[10px] font-medium text-emerald-700">{t("improved")}</span>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
