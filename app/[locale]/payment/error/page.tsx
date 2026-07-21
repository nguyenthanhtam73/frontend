import { getTranslations, setRequestLocale } from "next-intl/server";

import { PaymentResultView } from "@/components/payment/payment-result-view";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.paymentError" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function PaymentErrorPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PaymentResultView kind="error" />;
}
