import type { PlanTier } from "@/lib/premium/features";

export type BillingInterval = "monthly" | "yearly";

/** Catalog prices in VND. Yearly totals bake in ~28% off vs 12× monthly. */
export const PLAN_PRICES = {
  free: { monthly: 0, yearlyTotal: 0 },
  premium: { monthly: 99_000, yearlyTotal: 849_000 }, // ~29% vs 1,188,000
  premium_plus: { monthly: 159_000, yearlyTotal: 1_369_000 }, // ~28% vs 1,908,000
} as const;

export const YEARLY_SAVE_PERCENT = 28;

export type PricedPlan = Exclude<PlanTier, "free">;

export function priceForDisplay(
  plan: PlanTier,
  interval: BillingInterval,
): { amount: number; perMonth: number; billedTotal: number } {
  if (plan === "free") {
    return { amount: 0, perMonth: 0, billedTotal: 0 };
  }
  const row = PLAN_PRICES[plan];
  if (interval === "monthly") {
    return { amount: row.monthly, perMonth: row.monthly, billedTotal: row.monthly };
  }
  const perMonth = Math.round(row.yearlyTotal / 12);
  return { amount: perMonth, perMonth, billedTotal: row.yearlyTotal };
}

export function formatVnd(amount: number, locale: string): string {
  if (amount <= 0) return "0";
  return new Intl.NumberFormat(locale === "vi" ? "vi-VN" : "en-US", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Feature rows for the comparison table — keys map to `pricing.compare.*` i18n. */
export const COMPARE_ROWS = [
  { key: "aiSuggest", free: "quota3", premium: "unlimited", plus: "unlimited" },
  { key: "editRoutine", free: "quota5", premium: "unlimited", plus: "unlimited" },
  { key: "wardrobe", free: "viewOnly", premium: "full", plus: "full" },
  { key: "progress", free: "months3", premium: "months12", plus: "allTime" },
  { key: "milestones", free: "basic", premium: "full", plus: "full" },
  { key: "export", free: "no", premium: "yes", plus: "yes" },
  { key: "noAds", free: "no", premium: "yes", plus: "yes" },
  { key: "advanced", free: "no", premium: "no", plus: "yes" },
] as const;

export type CompareRowKey = (typeof COMPARE_ROWS)[number]["key"];
