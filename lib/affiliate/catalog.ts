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
const AFF_LINK_RE = /^https:\/\/s\.shopee\.vn\/[A-Za-z0-9]+$/;

function isProduct(value: unknown): value is AffiliateProduct {
  if (!value || typeof value !== "object") return false;
  const item = value as AffiliateProduct & { url?: unknown; commission?: unknown; reviewCount?: unknown; subId1?: unknown };
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
    item.shop.trim().length > 0 &&
    typeof item.affLink === "string" &&
    AFF_LINK_RE.test(item.affLink) &&
    typeof item.acid === "boolean" &&
    typeof item.popularity === "number" &&
    Number.isFinite(item.popularity) &&
    item.url === undefined &&
    item.commission === undefined &&
    item.reviewCount === undefined &&
    item.subId1 === undefined
  );
}

function assertCatalog(value: unknown): AffiliateCatalog {
  if (!value || typeof value !== "object") {
    throw new Error("Affiliate catalog is not an object");
  }
  const record = value as { batch?: unknown; items?: unknown };
  if (typeof record.batch !== "string" || !/^w\d{8}$/.test(record.batch)) {
    throw new Error("Affiliate catalog batch must look like wYYYYMMDD");
  }
  if (!Array.isArray(record.items) || record.items.length === 0) {
    throw new Error("Affiliate catalog has no items");
  }
  if (!record.items.every(isProduct)) {
    throw new Error("Affiliate catalog has an item with a bad step, price, or link");
  }
  const items = record.items as AffiliateProduct[];
  const links = new Set<string>();
  for (const item of items) {
    if (links.has(item.affLink)) {
      throw new Error(`Affiliate catalog has a duplicate affLink ${item.affLink}`);
    }
    links.add(item.affLink);
  }
  // Steps with no rows are allowed. The matcher simply has nothing to show for them.
  return { batch: record.batch, items };
}

export const affiliateCatalog: AffiliateCatalog = assertCatalog(raw);

export function isAffiliateFitTag(value: string): value is AffiliateFitTag {
  return TAGS.has(value);
}

export function isAffiliateStep(value: string): value is AffiliateStep {
  return STEPS.has(value);
}
