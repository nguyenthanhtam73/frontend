import { getTranslations } from "next-intl/server";

import { pageLocaleMetadata } from "@/lib/seo";

import { RoutineEditor } from "@/components/routine/routine-editor";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.routine" });
  return pageLocaleMetadata({
    title: t("title"),
    description: t("description"),
    locale,
    path: "/routine",
    noIndex: true,
  });
}

/**
 * /routine — Routine Management page.
 * Header stays short so the AM/PM editor (inside RoutineEditor) is above the fold.
 */
export default async function RoutinePage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "routine" });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="mb-5 max-w-2xl space-y-1.5 sm:mb-6 sm:space-y-2">
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

      <RoutineEditor />
    </div>
  );
}
