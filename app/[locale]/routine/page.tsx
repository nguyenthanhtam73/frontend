import { Moon, Sparkles, Sun } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { RoutineEditor } from "@/components/routine/routine-editor";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.routine" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

/**
 * /routine — Routine Management page.
 *
 * Layout breakdown:
 *   - Eyebrow + title + subtitle (a calm motivational header).
 *   - Three hero tiles for AM / PM / AI suggest with subtle accent colors so
 *     the page sets visual context before the editor appears.
 *   - <RoutineEditor /> — the actual interactive editor (client component).
 *
 * The page itself is server-rendered for fast first paint; only the editor
 * hydrates on the client. Mobile gets generous bottom padding so the sticky
 * Save bar inside the editor never overlaps content.
 */
export default async function RoutinePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "routine" });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-6 max-w-2xl space-y-2 sm:mb-8 sm:space-y-3">
        <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          <span className="inline-block size-1.5 rounded-full bg-primary" aria-hidden />
          {t("sectionEyebrow")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl">
          {t("pageTitle")}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t("pageSub")}
        </p>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-2 sm:mb-8 sm:grid-cols-3">
        <HeroTile
          icon={<Sun className="size-4 text-amber-500" aria-hidden />}
          ringClass="ring-amber-300/60 dark:ring-amber-300/30"
          title={t("morningTitle")}
          desc={t("morningDesc")}
        />
        <HeroTile
          icon={<Moon className="size-4 text-indigo-500" aria-hidden />}
          ringClass="ring-indigo-300/60 dark:ring-indigo-300/30"
          title={t("eveningTitle")}
          desc={t("eveningDesc")}
        />
        <HeroTile
          icon={<Sparkles className="size-4 text-primary" aria-hidden />}
          ringClass="ring-primary/30"
          title={t("aiSuggestTitle")}
          desc={t("aiSuggestBody")}
        />
      </div>

      <RoutineEditor locale={locale} />
    </div>
  );
}

function HeroTile({
  icon,
  title,
  desc,
  ringClass,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  ringClass: string;
}) {
  return (
    <div className="group flex gap-3 rounded-xl border border-border/80 bg-card/60 px-3 py-2.5 shadow-sm backdrop-blur transition-all hover:border-primary/30 hover:bg-card hover:shadow-md sm:px-4 sm:py-3">
      <span
        className={`mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-1 ${ringClass}`}
      >
        {icon}
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-sm font-semibold leading-tight">{title}</p>
        <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
