import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";

import { redirect } from "@/i18n/navigation";
import { pageLocaleMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.cabinet" });
  return pageLocaleMetadata({
    title: t("title"),
    description: t("description"),
    locale,
    path: "/wardrobe",
    noIndex: true,
  });
}

/** Legacy route: fashion wardrobe → skincare cabinet. */
export default async function WardrobeRedirectPage() {
  const locale = await getLocale();
  redirect({ href: "/cabinet", locale });
}
