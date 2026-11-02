"use client";

import { useLocale, useTranslations } from "next-intl";

import { BeDaStage } from "@/components/mascot/be-da-stage";
import {
  MOOD_SHEET,
  defaultSnapshot,
  resolveBeDaView,
  type BeDaView,
  type SkinMark,
} from "@/lib/mascot/model";

function viewFor(mood: string, missedDays: number, marks: SkinMark[] = [], prev: SkinMark[] = []): BeDaView {
  return resolveBeDaView({
    snapshot: {
      ...defaultSnapshot(),
      mood,
      missedDays,
      isDefault: false,
      skinMarks: marks,
      skinMarksPrev: prev,
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
    <div className="mx-auto w-[390px] bg-background">
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
  );
}
