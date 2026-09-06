import type { AdminFunnelStats } from "@/lib/types/admin-funnel";

export type AdminFunnelLoadError = "auth" | "forbidden" | "unknown";

/** D1 cards show `n / eligible` (who already reached the next Vietnam day). */
export function formatEligibleRatio(count: number, eligible: number): string {
  return `${count} / ${eligible}`;
}

export function isPaywallUntracked(views: number | null | undefined): boolean {
  return views == null;
}

/** Prefer the dedicated 7d field; fall back to the legacy single count. */
export function resolvePaywallViews7d(
  stats: Pick<AdminFunnelStats, "paywall_views" | "paywall_views_7d">,
): number | null {
  if (!isPaywallUntracked(stats.paywall_views_7d)) return stats.paywall_views_7d as number;
  if (!isPaywallUntracked(stats.paywall_views)) return stats.paywall_views as number;
  return null;
}

export function formatPaywallCard(
  views: number | null | undefined,
  untrackedLabel: string,
): string {
  return isPaywallUntracked(views) ? untrackedLabel : String(views);
}

export function adminFunnelLoadError(error: unknown): AdminFunnelLoadError {
  if (error instanceof Error) {
    if (error.message === "auth") return "auth";
    if (error.message === "forbidden") return "forbidden";
  }
  return "unknown";
}

export function d1Ratio(stats: Pick<AdminFunnelStats, "d1_checkin_users" | "d1_eligible_users">) {
  return formatEligibleRatio(stats.d1_checkin_users, stats.d1_eligible_users);
}

export function d1Ratio7d(
  stats: Pick<AdminFunnelStats, "d1_checkin_users_7d" | "d1_eligible_users_7d">,
) {
  return formatEligibleRatio(stats.d1_checkin_users_7d, stats.d1_eligible_users_7d);
}
