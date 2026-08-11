import { getTranslations, setRequestLocale } from "next-intl/server";

import { pageLocaleMetadata } from "@/lib/seo";

import { PaymentResultView } from "@/components/payment/payment-result-view";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.paymentCancel" });
  return pageLocaleMetadata({
    title: t("title"),
    description: t("description"),
    locale,
    path: "/payment/cancel",
    noIndex: true,
  });
}

export default async function PaymentCancelPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PaymentResultView kind="cancel" />;
}
