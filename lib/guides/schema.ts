import { absoluteUrl, siteOrigin } from "@/lib/seo";

import { listGuideFigures } from "./figures";
import type { ClimateHubCopy } from "./hub";
import { GUIDE_CLIMATE_HUB_PATH } from "./types";
import type { GuideArticle, GuideChrome } from "./types";

export function guideArticleJsonLd(article: GuideArticle, locale: string) {
  const url = absoluteUrl(locale, article.path);
  const images = [
    absoluteUrl(locale, article.ogImage.url),
    ...listGuideFigures(article).map((figure) => absoluteUrl(locale, figure.src)),
  ];
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    inLanguage: locale === "en" ? "en" : "vi",
    url,
    datePublished: article.datePublished,
    dateModified: article.dateModified,
    image: images,
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

export function climateHubBreadcrumbJsonLd(locale: string, chrome: GuideChrome) {
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
        name: chrome.breadcrumbHub,
        item: absoluteUrl(locale, GUIDE_CLIMATE_HUB_PATH),
      },
    ],
  };
}

function guideItemList(articles: GuideArticle[], locale: string) {
  return {
    "@type": "ItemList" as const,
    numberOfItems: articles.length,
    itemListElement: articles.map((article, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: article.title,
      url: absoluteUrl(locale, article.path),
    })),
  };
}

/** CollectionPage + ItemList for the /guides catalog. */
export function guidesIndexCollectionJsonLd(
  locale: string,
  chrome: GuideChrome,
  articles: GuideArticle[],
) {
  const url = absoluteUrl(locale, "/guides");
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: chrome.indexHeading,
    description: chrome.indexDescription,
    inLanguage: locale === "en" ? "en" : "vi",
    url,
    isPartOf: { "@type": "WebSite", name: "DaDiary", url: siteOrigin() },
    mainEntity: guideItemList(articles, locale),
  };
}

/** CollectionPage + ItemList + FAQ for the climate hub. */
export function climateHubJsonLd(hub: ClimateHubCopy, locale: string) {
  const url = absoluteUrl(locale, hub.path);
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: hub.heading,
    description: hub.description,
    inLanguage: locale === "en" ? "en" : "vi",
    url,
    datePublished: hub.datePublished,
    dateModified: hub.dateModified,
    image: absoluteUrl(locale, hub.ogImage.url),
    isPartOf: { "@type": "WebSite", name: "DaDiary", url: siteOrigin() },
    mainEntity: guideItemList(
      hub.clusters.flatMap((cluster) => cluster.articles),
      locale,
    ),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
  };
}

export function climateHubFaqJsonLd(hub: ClimateHubCopy) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: hub.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}
