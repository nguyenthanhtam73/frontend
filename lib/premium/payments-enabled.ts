/**
 * Self-serve SePay checkout (Pricing → Upgrade).
 *
 * Beta default: OFF — Free for everyone; Premium is granted by admin.
 * Set NEXT_PUBLIC_SEPAY_CHECKOUT_ENABLED=true to re-open paid upgrades.
 */
export function isSePayCheckoutEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_SEPAY_CHECKOUT_ENABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}
