"use client";

import { useLocale, useTranslations } from "next-intl";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import { BeDaGlowNote } from "@/components/mascot/be-da-glow-note";
import { BeDaStage } from "@/components/mascot/be-da-stage";
import {
  MOOD_SHEET,
  defaultSnapshot,
  resolveBeDaView,
  type BeDaView,
  type SkinMark,
} from "@/lib/mascot/model";

function viewFor(
  mood: string,
  missedDays: number,
  marks: SkinMark[] = [],
  prev: SkinMark[] = [],
  glow?: { level: number; glowProgress: number | null; near?: boolean },
): BeDaView {
  return resolveBeDaView({
    snapshot: {
      ...defaultSnapshot(),
      mood,
      missedDays,
      isDefault: false,
      skinMarks: marks,
      skinMarksPrev: prev,
      ...(glow
        ? { glowLevel: glow.level, glowProgress: glow.glowProgress, nearLevelUp: glow.near ?? false }
        : {}),
    },
    missedDays,
    sessionHappy: false,
    locale: "vi",
  });
}

const HEAVY: SkinMark[] = [
  { concern: "acne", level: "heavy" },
  { concern: "oily", level: "heavy" },
  { concern: "dark_spot", level: "heavy" },
  { concern: "dry", level: "heavy" },
  { concern: "red", level: "medium" },
];

const MEDIUM: SkinMark[] = [
  { concern: "acne", level: "medium" },
  { concern: "oily", level: "light" },
  { concern: "dark_spot", level: "medium" },
];

const CLEAN: SkinMark[] = [{ concern: "acne", level: "light" }];

export function BeDaSheet() {
  const t = useTranslations("mascot");
  const locale = useLocale();
  const moods = MOOD_SHEET.map((row) => ({
    ...row,
    view: viewFor(row.mood, row.missedDays),
  }));
  const skins: { id: string; view: BeDaView }[] = [
    { id: "heavy", view: viewFor("acne", 0, HEAVY) },
    { id: "medium", view: viewFor("oily", 0, MEDIUM, [{ concern: "acne", level: "heavy" }]) },
    {
      id: "clean",
      view: viewFor("sparkle", 0, CLEAN, [{ concern: "acne", level: "medium" }]),
    },
  ];
  return (
    <div className="bg-background">
    <div className="mx-auto w-[390px]">
      <div id="be-da-mood-sheet" data-testid="be-da-mood-sheet">
        {moods.map((row) => {
          const line = t(`lines.${row.view.lineKey}`);
          return (
            <section key={row.id} className="border-b border-border px-3 py-3" data-sheet-mood={row.id}>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {row.id}
              </p>
              <BeDaStage view={row.view} line={line} locale={locale} />
            </section>
          );
        })}
      </div>
      <div id="be-da-skin-sheet" data-testid="be-da-skin-sheet">
        {skins.map((row) => (
          <section key={row.id} className="border-b border-border px-3 py-3" data-sheet-skin={row.id}>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {row.id}
            </p>
            <BeDaStage
              view={row.view}
              line={t(`lines.${row.view.lineKey}`)}
              locale={locale}
            />
          </section>
        ))}
      </div>
    </div>
      <BeDaGlowLadder />
    </div>
  );
}

function BeDaGlowLadder() {
  const locale = useLocale();
  const levels = [1, 2, 3, 4, 5, 6];
  const marks: SkinMark[] = [{ concern: "acne", level: "heavy" }];
  return (
    <div id="be-da-glow-sheet" data-testid="be-da-glow-sheet" className="bg-[#FFF8F3] px-4 py-4">
      <div className="flex flex-wrap items-end gap-3">
        {levels.map((level) => {
          const view = viewFor("happy", 0, marks, [], {
            level,
            glowProgress: level === 6 ? 1 : (level - 1) / 5,
            near: level === 5,
          });
          return (
            <section key={level} className="w-[132px]" data-glow-level={level}>
              <BeDaFigure view={view} locale={locale} className="w-full" />
              <BeDaGlowNote view={view} />
            </section>
          );
        })}
        <section className="w-[132px]" data-testid="be-da-glow-celebration">
          <BeDaFigure
            view={viewFor("happy", 0, marks, [], { level: 4, glowProgress: 0.15 })}
            locale={locale}
            className="w-full"
            glowCelebrate
          />
          <BeDaGlowNote
            view={viewFor("happy", 0, marks, [], { level: 4, glowProgress: 0.15 })}
            celebrate
          />
        </section>
      </div>
    </div>
  );
}
