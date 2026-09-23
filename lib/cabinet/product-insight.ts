/** Cached cabinet card. Mirrors backend dto.ProductInsight. */
export type ProductInsightActive = {
  label: string;
  plain: string;
};

export type ProductInsightFitVerdict = "yes" | "maybe" | "no";
export type ProductInsightBuyVerdict = "buy" | "wait";

export type ProductInsight = {
  whatItDoes: string;
  fit: { verdict: ProductInsightFitVerdict; reason: string };
  buy: { verdict: ProductInsightBuyVerdict; reason: string };
  actives: ProductInsightActive[];
  disclaimer: string;
  locale: string;
  version: number;
};

/** Bump together with backend CabinetInsightVersion. */
export const PRODUCT_INSIGHT_VERSION = 1;

const MAX_ACTIVES = 3;

export function insightLocale(locale: string): "vi" | "en" {
  return locale.toLowerCase().startsWith("en") ? "en" : "vi";
}

function asRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

function asText(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function fitVerdict(raw: unknown): ProductInsightFitVerdict {
  if (raw === "yes" || raw === "no" || raw === "maybe") return raw;
  return "maybe";
}

function buyVerdict(raw: unknown): ProductInsightBuyVerdict {
  if (raw === "buy" || raw === "wait") return raw;
  return "wait";
}

function readActives(raw: unknown): ProductInsightActive[] {
  if (!Array.isArray(raw)) return [];
  const out: ProductInsightActive[] = [];
  for (const item of raw) {
    const row = asRecord(item);
    if (!row) continue;
    const label = asText(row.label);
    const plain = asText(row.plain);
    if (!label || !plain) continue;
    out.push({ label, plain });
    if (out.length === MAX_ACTIVES) break;
  }
  return out;
}

/**
 * Map a wardrobe `insight` payload into the card model.
 * Returns null when the card cannot be shown (missing what / fit / buy / disclaimer).
 */
export function normalizeProductInsight(raw: unknown): ProductInsight | null {
  const row = asRecord(raw);
  if (!row) return null;
  const whatItDoes = asText(row.what_it_does);
  const disclaimer = asText(row.disclaimer);
  const fit = asRecord(row.fit_for_you);
  const buy = asRecord(row.buy_advice);
  const fitReason = asText(fit?.reason);
  const buyReason = asText(buy?.reason);
  if (!whatItDoes || !disclaimer || !fitReason || !buyReason) return null;
  const version = typeof row.version === "number" && Number.isFinite(row.version) ? row.version : 0;
  return {
    whatItDoes,
    fit: { verdict: fitVerdict(fit?.verdict), reason: fitReason },
    buy: { verdict: buyVerdict(buy?.verdict), reason: buyReason },
    actives: readActives(row.actives),
    disclaimer,
    locale: insightLocale(asText(row.locale) || "vi"),
    version,
  };
}

/** True when the stored card matches this UI language and copy version. */
export function isInsightCurrent(insight: ProductInsight | null, locale: string): boolean {
  if (!insight) return false;
  return insight.locale === insightLocale(locale) && insight.version === PRODUCT_INSIGHT_VERSION;
}
