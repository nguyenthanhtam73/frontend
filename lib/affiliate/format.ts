/** 333000 → 333.000đ. Prices are a reference, so the UI never strikes them through. */
export function formatVnd(amount: number): string {
  const digits = Math.max(0, Math.round(amount)).toString();
  return `${digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}đ`;
}

export function formatRating(rating: number, locale: "vi" | "en"): string {
  const fixed = rating.toFixed(1);
  return locale === "vi" ? fixed.replace(".", ",") : fixed;
}
