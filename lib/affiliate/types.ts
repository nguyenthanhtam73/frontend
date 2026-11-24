export const AFFILIATE_STEPS = [
  "cleanser",
  "serum",
  "moisturizer",
  "sunscreen",
  "makeup_remover",
  "support",
] as const;

export type AffiliateStep = (typeof AFFILIATE_STEPS)[number];

export const AFFILIATE_FIT_TAGS = [
  "oily",
  "dry",
  "normal",
  "acne",
  "pores",
  "dark_spots",
  "barrier",
  "hydration",
  "sensitive",
  "budget",
] as const;

export type AffiliateFitTag = (typeof AFFILIATE_FIT_TAGS)[number];

/** One row of a weekly batch. `url` is the catalog record — never a user-facing href. */
export type AffiliateProduct = {
  step: AffiliateStep;
  name: string;
  fit: AffiliateFitTag[];
  priceVnd: number;
  originalPriceVnd: number | null;
  commission: string;
  rating: number;
  reviewCount: string;
  sold: string;
  shop: string;
  url: string;
  affLink: string;
  subId1: string;
  subId2: string;
};

export type AffiliateCatalog = {
  batch: string;
  items: AffiliateProduct[];
};

export type AffiliateSkinType = "oily" | "dry" | "normal" | "combination" | "sensitive";

export type AffiliateConcern =
  | "acne"
  | "pores"
  | "dark_spots"
  | "dryness"
  | "oil"
  | "redness"
  | "barrier"
  | "hydration";

/** Signals the matcher is allowed to see. Built from data the app already loaded. */
export type AffiliateMatchInput = {
  userId: string;
  /** Calendar day in Asia/Ho_Chi_Minh, YYYY-MM-DD. */
  dayKey: string;
  skinTypes: AffiliateSkinType[];
  concerns: AffiliateConcern[];
  ownedSteps: AffiliateStep[];
  severe: boolean;
  /**
   * False when the cabinet request has not succeeded.
   * Why-lines must not claim a step is missing from the shelf.
   */
  cabinetKnown: boolean;
};

/** A shopper-facing pick. The product-page url is intentionally absent. */
export type AffiliateSuggestion = {
  step: AffiliateStep;
  name: string;
  shop: string;
  rating: number;
  sold: string;
  priceVnd: number;
  affLink: string;
  why: string;
  batch: string;
};
