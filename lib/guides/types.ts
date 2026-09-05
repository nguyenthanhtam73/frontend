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
  doLabel: string;
  avoidLabel: string;
};
