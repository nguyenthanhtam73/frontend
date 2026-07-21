import { getTranslations, setRequestLocale } from "next-intl/server";

import { PricingView } from "@/components/pricing/pricing-view";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.pricingPage" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PricingView />;
}
