import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { GuideArticleView } from "@/components/guides/guide-article";
import {
  GUIDE_SLUGS,
  getGuideArticle,
  isGuideSlug,
} from "@/lib/guides/catalog";
import { absoluteUrl, pageSocialMetadata, siteOrigin } from "@/lib/seo";

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
  });
}

export default async function GuideArticlePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  if (!isGuideSlug(slug)) notFound();

  const article = getGuideArticle(slug, locale);
  const url = absoluteUrl(locale, article.path);

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    inLanguage: locale === "en" ? "en" : "vi",
    url,
    author: { "@type": "Organization", name: "DaDiary", url: siteOrigin() },
    publisher: { "@type": "Organization", name: "DaDiary", url: siteOrigin() },
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: article.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />
      <GuideArticleView slug={slug} />
    </>
  );
}
