import { isInsightCurrent, normalizeProductInsight, type ProductInsight } from "./product-insight";

const PREFIX = "dadiary.cabinet-insight.";

type StoredInsight = {
  productKey: string;
  insight: ProductInsight;
};

function storage(): Storage | null {
  try {
    if (typeof localStorage === "undefined") return null;
    return localStorage;
  } catch {
    return null;
  }
}

export function readStoredInsight(productId: string, productKey: string, locale: string): ProductInsight | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(PREFIX + productId);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredInsight>;
    if (parsed.productKey !== productKey) return null;
    const insight = normalizeProductInsight(toApiShape(parsed.insight));
    if (!isInsightCurrent(insight, locale)) return null;
    return insight;
  } catch {
    return null;
  }
}

export function writeStoredInsight(productId: string, productKey: string, insight: ProductInsight): void {
  const store = storage();
  if (!store) return;
  try {
    const payload: StoredInsight = { productKey, insight };
    store.setItem(PREFIX + productId, JSON.stringify(payload));
  } catch {
    // Private mode or a full disk should not block the card.
  }
}

/** Cache stores the card model; normalize accepts the API field names. */
function toApiShape(insight: ProductInsight | undefined): unknown {
  if (!insight) return null;
  return {
    what_it_does: insight.whatItDoes,
    fit_for_you: insight.fit,
    buy_advice: insight.buy,
    actives: insight.actives,
    disclaimer: insight.disclaimer,
    locale: insight.locale,
    version: insight.version,
  };
}
