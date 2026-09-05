import type { AdminFunnelStats } from "@/lib/types/admin-funnel";

export type AdminFunnelLoadError = "auth" | "forbidden" | "unknown";

/** D1 cards show `n / eligible` (who already reached the next Vietnam day). */
export function formatEligibleRatio(count: number, eligible: number): string {
  return `${count} / ${eligible}`;
}

export function isPaywallUntracked(views: number | null | undefined): boolean {
  return views == null;
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
