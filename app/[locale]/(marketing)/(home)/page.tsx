import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Benefits } from "@/components/landing/benefits";
import { BetaSignup } from "@/components/landing/beta-signup";
import { Cta } from "@/components/landing/cta";
import { Features } from "@/components/landing/features";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { GuidesTeaser } from "@/components/landing/guides-teaser";
import { LANDING_FAQ_KEYS, LandingFaq } from "@/components/landing/landing-faq";
import { Problem } from "@/components/landing/problem";
import { ProgressPreview } from "@/components/landing/progress-preview";
import { Solution } from "@/components/landing/solution";
import { Testimonials } from "@/components/landing/testimonials";
import { absoluteUrl, ORGANIZATION_SAME_AS, pageSocialMetadata, siteOrigin } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

const HOW_STEPS = ["s1", "s2", "s3", "s4"] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.root" });
  return pageSocialMetadata({
    title: t("title"),
    description: t("description"),
    locale,
    path: "",
  });
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const tMeta = await getTranslations({ locale, namespace: "metadata.root" });
  const tHow = await getTranslations({ locale, namespace: "howItWorks" });
  const tFaq = await getTranslations({ locale, namespace: "landingFaq" });

  const webAppLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "DaDiary",
    url: absoluteUrl(locale, ""),
    description: tMeta("description"),
    applicationCategory: "HealthApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "VND",
    },
    publisher: {
      "@type": "Organization",
      name: "DaDiary",
      url: siteOrigin(),
      sameAs: [...ORGANIZATION_SAME_AS],
    },
  };

  const howToLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: tHow("heading"),
    description: tHow("side"),
    step: HOW_STEPS.map((key, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: tHow(`steps.${key}.title`),
      text: tHow(`steps.${key}.desc`),
    })),
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: LANDING_FAQ_KEYS.map((key) => ({
      "@type": "Question",
      name: tFaq(`${key}.question`),
      acceptedAnswer: {
        "@type": "Answer",
        text: tFaq(`${key}.answer`),
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <Hero />
      <Problem />
      <Solution />
      <Features />
      <ProgressPreview />
      <HowItWorks />
      <Testimonials />
      <LandingFaq />
      <GuidesTeaser />
      <BetaSignup />
      <Benefits />
      <Cta />
    </>
  );
}
