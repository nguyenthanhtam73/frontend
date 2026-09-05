import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { LegalDoc } from "@/components/legal/legal-doc";
import { pageSocialMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.privacyPage" });
  return pageSocialMetadata({
    title: t("title"),
    description: t("description"),
    locale,
    path: "/privacy",
  });
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalDoc kind="privacy" />;
}
