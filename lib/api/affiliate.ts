import { apiBaseUrl } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/api-envelope";
import { getAccessToken } from "@/lib/auth-token";
import type { ProductSuggestionDTO } from "@/lib/types/product-suggestion";

export type AffiliateClickSource =
  | "daily_feedback"
  | "routine_suggest"
  | "starter_routine";

/** POST /api/v1/affiliate/clicks — fire-and-forget click logging. */
export async function logAffiliateClick(
  item: ProductSuggestionDTO,
  source: AffiliateClickSource,
  contextId?: string,
): Promise<void> {
  const token = getAccessToken();
  if (!token) return;

  const res = await fetch(`${apiBaseUrl}/api/v1/affiliate/clicks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      product_name: item.product_name,
      brand: item.brand,
      affiliate_link: item.affiliate_link,
      price_range: item.price_range,
      priority: item.priority,
      source,
      context_id: contextId?.trim() || undefined,
    }),
  });

  if (!res.ok) {
    const raw = await res.json().catch(() => ({}));
    console.warn("affiliate click log failed:", getApiErrorMessage(raw, res.statusText));
  }
}
