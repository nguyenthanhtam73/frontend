import { getTranslations } from "next-intl/server";

import { ProgressTimeline } from "@/components/progress/progress-timeline";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.progress" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

/** /progress — Personal Progress Timeline + Before-After view.
 *
 *  This page wires the i18n shell + page hero; all data fetching, range filter
 *  state, and rendering live inside the client component `ProgressTimeline` so
 *  Server Component code stays trivial and metadata-friendly. */
export default async function ProgressPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "progress" });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 pb-16 sm:px-6 sm:py-10 lg:pb-20">
      <header className="mb-5 max-w-2xl space-y-2 sm:mb-6 sm:space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {t("sectionLabel")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl">
          {t("title")}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t("sub")}
        </p>
      </header>
      <ProgressTimeline />
    </div>
  );
}
