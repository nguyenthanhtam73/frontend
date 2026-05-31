import { getTranslations } from "next-intl/server";

import { MeMemoryView } from "@/components/memory/me-memory-view";
import { PrivacyControls } from "@/components/privacy/privacy-controls";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.meMemory" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function MeMemoryPage() {
  const t = await getTranslations("meMemory");

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

      <MeMemoryView />

      <div className="mt-10">
        <PrivacyControls />
      </div>
    </div>
  );
}
