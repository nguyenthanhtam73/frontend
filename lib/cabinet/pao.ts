import { isWardrobeCategoryId, type WardrobeCategoryId } from "@/lib/cabinet/categories";

export type { WardrobeCategoryId };

/**
 * Suggested period-after-opening (months) by category — soft guidance only.
 */
export const PAO_MONTHS_BY_CATEGORY: Record<WardrobeCategoryId, { min: number; max: number }> = {
  cleanser: { min: 12, max: 12 },
  toner: { min: 6, max: 12 },
  serum: { min: 6, max: 12 },
  moisturizer: { min: 6, max: 12 },
  spf: { min: 12, max: 12 },
  treatment: { min: 6, max: 12 },
  mask: { min: 6, max: 12 },
  other: { min: 6, max: 12 },
};

export type PaoHint = {
  /** Whole months since opened (UTC calendar approx). */
  monthsOpen: number;
  suggestedMin: number;
  suggestedMax: number;
  category: WardrobeCategoryId | "unknown";
};

function asCategory(raw: string | undefined): WardrobeCategoryId | "unknown" {
  if (!raw) return "unknown";
  if (isWardrobeCategoryId(raw)) return raw;
  return "unknown";
}

/** Months between opened date (YYYY-MM-DD) and now; null if invalid. */
export function monthsSinceOpened(openedAt: string, now = new Date()): number | null {
  const d = new Date(`${openedAt.trim()}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  const ms = now.getTime() - d.getTime();
  if (ms < 0) return 0;
  return Math.floor(ms / (1000 * 60 * 60 * 24 * 30.4375));
}

export function getPaoHint(
  openedAt: string | undefined,
  categoryRaw: string | undefined,
  now = new Date(),
): PaoHint | null {
  if (!openedAt?.trim()) return null;
  const monthsOpen = monthsSinceOpened(openedAt, now);
  if (monthsOpen == null) return null;
  const category = asCategory(categoryRaw);
  const range =
    category === "unknown"
      ? { min: 6, max: 12 }
      : PAO_MONTHS_BY_CATEGORY[category];
  return {
    monthsOpen,
    suggestedMin: range.min,
    suggestedMax: range.max,
    category,
  };
}
