/** w20261124 → 24/11. The price label shows when this batch was noted. */
export function batchDateLabel(batch: string): string | null {
  const match = /^w(\d{4})(\d{2})(\d{2})$/.exec(batch.trim());
  if (!match) return null;
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${day}/${month}`;
}

/** 333000 → 333.000đ. Prices are a reference, so the UI never strikes them through. */
export function formatVnd(amount: number): string {
  const digits = Math.max(0, Math.round(amount)).toString();
  return `${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}đ`;
}

export function formatRating(rating: number, locale: "vi" | "en"): string {
  const fixed = rating.toFixed(1);
  return locale === "vi" ? fixed.replace(".", ",") : fixed;
}
