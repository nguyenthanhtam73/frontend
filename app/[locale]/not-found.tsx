import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { ButtonLink } from "@/components/ui/button-link";
import { Link } from "@/i18n/navigation";

/** Soft-404 pages must stay out of the index. */
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

/** Locale-aware 404 — rendered inside `[locale]/layout` (correct `lang` + chrome). */
export default async function LocaleNotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        404
      </p>
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">{t("title")}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("body")}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <ButtonLink href="/" size="sm">
          {t("home")}
        </ButtonLink>
        <Link
          href="/pricing"
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("pricing")}
        </Link>
      </div>
    </div>
  );
}
