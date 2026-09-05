import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { GuidesClimateHubView } from "@/components/guides/guides-climate-hub";
import { guideChrome } from "@/lib/guides/catalog";
import { GUIDE_CLIMATE_HUB_PATH, getClimateHub } from "@/lib/guides/hub";
import {
  climateHubBreadcrumbJsonLd,
  climateHubFaqJsonLd,
  climateHubJsonLd,
} from "@/lib/guides/schema";
import { pageSocialMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const hub = getClimateHub(locale);
  return pageSocialMetadata({
    title: hub.title,
    description: hub.description,
    locale,
    path: GUIDE_CLIMATE_HUB_PATH,
    images: [hub.ogImage],
  });
}

export default async function ClimateHubPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const chrome = guideChrome(locale);
  const hub = getClimateHub(locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(climateHubJsonLd(hub, locale)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(climateHubFaqJsonLd(hub)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(climateHubBreadcrumbJsonLd(locale, chrome)),
        }}
      />
      <GuidesClimateHubView />
    </>
  );
}
