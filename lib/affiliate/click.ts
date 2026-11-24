import { sendFunnelEvent } from "@/lib/analytics/funnel-events";

import type { AffiliateStep } from "./types";

/**
 * First-party funnel ingest only. Does not add a Meta or TikTok pixel event.
 * The shopper's tab still opens the affiliate link if this request fails.
 */
export function logAffiliateSuggestionClick(step: AffiliateStep, batch: string): void {
  sendFunnelEvent("affiliate_click", { step, batch });
}
