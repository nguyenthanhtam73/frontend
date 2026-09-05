import { absoluteUrl, siteOrigin } from "@/lib/seo";

import type { GuideArticle, GuideChrome } from "./types";

export function guideArticleJsonLd(article: GuideArticle, locale: string) {
  const url = absoluteUrl(locale, article.path);
  const image = absoluteUrl(locale, article.ogImage.url);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    inLanguage: locale === "en" ? "en" : "vi",
    url,
    datePublished: article.datePublished,
    dateModified: article.dateModified,
    image: [image],
    author: { "@type": "Organization", name: "DaDiary", url: siteOrigin() },
    publisher: { "@type": "Organization", name: "DaDiary", url: siteOrigin() },
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
}

export function guideFaqJsonLd(article: GuideArticle) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: article.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function guideBreadcrumbJsonLd(
  article: GuideArticle,
  locale: string,
  chrome: GuideChrome,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: chrome.breadcrumbHome,
        item: absoluteUrl(locale, ""),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: chrome.breadcrumbGuides,
        item: absoluteUrl(locale, "/guides"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: article.title,
        item: absoluteUrl(locale, article.path),
      },
    ],
  };
}

export function guidesIndexBreadcrumbJsonLd(locale: string, chrome: GuideChrome) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: chrome.breadcrumbHome,
        item: absoluteUrl(locale, ""),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: chrome.breadcrumbGuides,
        item: absoluteUrl(locale, "/guides"),
      },
    ],
  };
}
