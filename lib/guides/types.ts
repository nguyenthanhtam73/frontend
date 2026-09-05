export const GUIDE_SLUGS = [
  "da-dau",
  "mun",
  "kem-chong-nang",
  "routine-cham-da",
  "tham-mun",
  "da-dau-van-phong",
] as const;

export type GuideSlug = (typeof GUIDE_SLUGS)[number];

export type GuideLocale = "vi" | "en";

export type GuideFaq = {
  question: string;
  answer: string;
};

export type GuideSubsection = {
  heading: string;
  paragraphs: string[];
  checklist?: string[];
};

export type GuideSection = {
  heading: string;
  paragraphs: string[];
  checklist?: string[];
  subsections?: GuideSubsection[];
};

export type GuideArticleCopy = {
  title: string;
  description: string;
  kicker: string;
  lede: string;
  sections: GuideSection[];
  faqs: GuideFaq[];
};

export type GuideOgImage = {
  url: string;
  width: number;
  height: number;
  alt: string;
};

export type GuideArticle = GuideArticleCopy & {
  slug: GuideSlug;
  path: string;
  related: GuideSlug[];
  datePublished: string;
  dateModified: string;
  ogImage: GuideOgImage;
};

export type GuideChrome = {
  indexTitle: string;
  indexDescription: string;
  indexHeading: string;
  indexSub: string;
  ctaPhoto: string;
  ctaHint: string;
  relatedHeading: string;
  disclaimer: string;
  readGuide: string;
  updatedLabel: string;
  breadcrumbHome: string;
  breadcrumbGuides: string;
};
