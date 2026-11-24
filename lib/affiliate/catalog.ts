import raw from "./products.json";
import {
  AFFILIATE_FIT_TAGS,
  AFFILIATE_STEPS,
  type AffiliateCatalog,
  type AffiliateFitTag,
  type AffiliateProduct,
  type AffiliateStep,
} from "./types";

const STEPS = new Set<string>(AFFILIATE_STEPS);
const TAGS = new Set<string>(AFFILIATE_FIT_TAGS);

function isProduct(value: unknown): value is AffiliateProduct {
  if (!value || typeof value !== "object") return false;
  const item = value as AffiliateProduct;
  return (
    STEPS.has(item.step) &&
    typeof item.name === "string" &&
    item.name.trim().length > 0 &&
    Array.isArray(item.fit) &&
    item.fit.every((tag) => TAGS.has(tag)) &&
    typeof item.priceVnd === "number" &&
    (item.originalPriceVnd === null || typeof item.originalPriceVnd === "number") &&
    typeof item.rating === "number" &&
    typeof item.sold === "string" &&
    typeof item.shop === "string" &&
    typeof item.affLink === "string" &&
    item.affLink.length > 0 &&
    typeof item.url === "string" &&
    item.affLink !== item.url &&
    typeof item.subId2 === "string"
  );
}

function assertCatalog(value: unknown): AffiliateCatalog {
  if (!value || typeof value !== "object") {
    throw new Error("Affiliate catalog is not an object");
  }
  const record = value as { batch?: unknown; items?: unknown };
  if (typeof record.batch !== "string" || !record.batch.trim()) {
    throw new Error("Affiliate catalog is missing batch");
  }
  if (!Array.isArray(record.items) || record.items.length === 0) {
    throw new Error("Affiliate catalog has no items");
  }
  if (!record.items.every(isProduct)) {
    throw new Error("Affiliate catalog has an item with a bad step, price, or link");
  }
  const items = record.items as AffiliateProduct[];
  if (items.some((item) => item.subId2 !== record.batch)) {
    throw new Error("Affiliate catalog batch does not match sub_id2");
  }
  return { batch: record.batch, items };
}

export const affiliateCatalog: AffiliateCatalog = assertCatalog(raw);

export function isAffiliateFitTag(value: string): value is AffiliateFitTag {
  return TAGS.has(value);
}

export function isAffiliateStep(value: string): value is AffiliateStep {
  return STEPS.has(value);
}
