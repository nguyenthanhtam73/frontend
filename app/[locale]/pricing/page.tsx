import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { PricingView } from "@/components/pricing/pricing-view";
import { isSePayCheckoutEnabled } from "@/lib/premium/payments-enabled";
import { pageSocialMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

const FAQ_KEYS = ["q1", "q2", "q3", "q4"] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.pricingPage" });
  return pageSocialMetadata({
    title: t("title"),
    description: t("description"),
    locale,
    path: "/pricing",
  });
}

export default async function PricingPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tFaq = await getTranslations({ locale, namespace: "pricing.faq" });
  const checkoutEnabled = isSePayCheckoutEnabled();
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_KEYS.map((key) => ({
      "@type": "Question",
      name: tFaq(`${key}.question`),
      acceptedAnswer: {
        "@type": "Answer",
        text:
          key === "q4" && !checkoutEnabled
            ? tFaq("q4.answerBeta")
            : tFaq(`${key}.answer`),
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <PricingView />
    </>
  );
}
