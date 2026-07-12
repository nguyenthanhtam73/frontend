import { apiPost } from "@/lib/api-client";
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
  if (!getAccessToken()) return;

  // Analytics only — never bother the user (no toast) and never throw; a failed
  // click log must not disrupt the outbound navigation the user just triggered.
  try {
    await apiPost("/api/v1/affiliate/clicks", {
      product_name: item.product_name,
      brand: item.brand,
      affiliate_link: item.affiliate_link,
      price_range: item.price_range,
      priority: item.priority,
      source,
      context_id: contextId?.trim() || undefined,
    }, { toastOnError: false });
  } catch {
    /* swallow — best-effort logging */
  }
}
