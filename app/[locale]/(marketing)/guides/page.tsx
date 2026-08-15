import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import { GuidesIndexView } from "@/components/guides/guides-index";
import { guideChrome } from "@/lib/guides/catalog";
import { pageSocialMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const chrome = guideChrome(locale);
  return pageSocialMetadata({
    title: chrome.indexTitle,
    description: chrome.indexDescription,
    locale,
    path: "/guides",
  });
}

export default async function GuidesIndexPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <GuidesIndexView />;
}
