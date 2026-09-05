export const GUIDE_SLUGS = [
  "da-dau",
  "mun",
  "kem-chong-nang",
  "routine-cham-da",
  "tham-mun",
  "da-dau-van-phong",
  "da-kho",
  "da-nhay-cam",
  "retinol-cho-nguoi-moi",
] as const;

export type GuideSlug = (typeof GUIDE_SLUGS)[number];

/** Climate-intent hub URL — not a tenth article slug. */
export const GUIDE_CLIMATE_HUB_PATH = "/guides/da-nong-am";
export const GUIDE_CLIMATE_HUB_SLUG = "da-nong-am";

export type GuideClusterId = "skinTypes" | "concerns" | "sunOffice" | "startHere";

export type GuideClusterDef = {
  id: GuideClusterId;
  slugs: readonly GuideSlug[];
};

/** Every article slug appears in exactly one cluster. */
export const GUIDE_CLUSTERS: readonly GuideClusterDef[] = [
  { id: "skinTypes", slugs: ["da-dau", "da-kho", "da-nhay-cam"] },
  { id: "concerns", slugs: ["mun", "tham-mun"] },
  { id: "sunOffice", slugs: ["kem-chong-nang", "da-dau-van-phong"] },
  { id: "startHere", slugs: ["routine-cham-da", "retinol-cho-nguoi-moi"] },
] as const;

export type GuideLocale = "vi" | "en";

export type GuideFaq = {
  question: string;
  answer: string;
};

export type GuideFigure = {
  src: string;
  width: number;
  height: number;
  alt: string;
  caption?: string;
};

export type GuideDoAvoid = {
  doItems: string[];
  avoidItems: string[];
  doHeading?: string;
  avoidHeading?: string;
};

export type GuideSubsection = {
  heading: string;
  paragraphs: string[];
  checklist?: string[];
  figure?: GuideFigure;
};

export type GuideSection = {
  heading: string;
  paragraphs: string[];
  checklist?: string[];
  doAvoid?: GuideDoAvoid;
  figure?: GuideFigure;
  subsections?: GuideSubsection[];
};

export type GuideArticleCopy = {
  title: string;
  description: string;
  kicker: string;
  lede: string;
  heroFigure?: GuideFigure;
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
  breadcrumbHub: string;
  climateHubLabel: string;
  doLabel: string;
  avoidLabel: string;
};
