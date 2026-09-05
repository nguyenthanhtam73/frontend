import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { GuideArticleView } from "@/components/guides/guide-article";
import {
  GUIDE_SLUGS,
  getGuideArticle,
  guideChrome,
  isGuideSlug,
} from "@/lib/guides/catalog";
import {
  guideArticleJsonLd,
  guideBreadcrumbJsonLd,
  guideFaqJsonLd,
} from "@/lib/guides/schema";
import { pageSocialMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string; slug: string }> };

export function generateStaticParams() {
  return GUIDE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isGuideSlug(slug)) {
    return { robots: { index: false, follow: false } };
  }
  const article = getGuideArticle(slug, locale);
  return pageSocialMetadata({
    title: `${article.title} · DaDiary`,
    description: article.description,
    locale,
    path: article.path,
    images: [article.ogImage],
    ogType: "article",
    publishedTime: article.datePublished,
    modifiedTime: article.dateModified,
  });
}

export default async function GuideArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  if (!isGuideSlug(slug)) notFound();

  const article = getGuideArticle(slug, locale);
  const chrome = guideChrome(locale);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(guideArticleJsonLd(article, locale)),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(guideFaqJsonLd(article)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(guideBreadcrumbJsonLd(article, locale, chrome)),
        }}
      />
      <GuideArticleView slug={slug} />
    </>
  );
}
