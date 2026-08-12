import { getTranslations } from "next-intl/server";

import { pageLocaleMetadata } from "@/lib/seo";

import { PrivacyControls } from "@/components/privacy/privacy-controls";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.settings" });
  return pageLocaleMetadata({
    title: t("title"),
    description: t("description"),
    locale,
    path: "/settings",
    noIndex: true,
  });
}

export default async function SettingsPage() {
  const t = await getTranslations("settingsPage");

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {t("sectionLabel")}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="max-w-2xl text-muted-foreground">{t("sub")}</p>
        <Link
          href="/cabinet"
          className="inline-block text-sm font-medium text-primary underline underline-offset-4"
        >
          {t("backCabinet")}
        </Link>
      </div>

      <PrivacyControls />
    </div>
  );
}
