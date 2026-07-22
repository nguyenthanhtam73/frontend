import { apiPost } from "@/lib/api-client";
import type { AuthUser } from "@/lib/stores/auth-store";

/** Partial user fields returned by POST /subscription/cancel. */
export type CancelSubscriptionUserPatch = Pick<
  AuthUser,
  | "plan_tier"
  | "plan_expires_at"
  | "subscription_status"
  | "trial_ends_at"
  | "canceled_at"
  | "grace_ends_at"
  | "days_left"
  | "in_grace"
  | "cancel_at_period_end"
  | "eligible_for_trial"
>;

export type CancelSubscriptionResult = {
  subscription?: {
    active?: boolean;
    plan_tier?: string;
    subscription_status?: string;
    days_left?: number;
    in_grace?: boolean;
    cancel_at_period_end?: boolean;
  };
  user?: CancelSubscriptionUserPatch;
};

/**
 * Cancel the current Premium plan at period end (POST /api/v1/subscription/cancel).
 * Access continues until plan_expires_at + grace.
 */
export async function cancelSubscription(): Promise<CancelSubscriptionResult> {
  return apiPost<CancelSubscriptionResult>("/api/v1/subscription/cancel", {}, {
    toastOnError: false,
    fallbackMessage: "cancel_failed",
  });
}
