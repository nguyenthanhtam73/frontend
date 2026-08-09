import { hasSkippedOnboarding } from "@/lib/onboarding/skip";

type AuthUserLike = {
  id?: string;
  onboarding_completed?: boolean;
  onboarding_skipped?: boolean;
} | null | undefined;

/**
 * Where to send the user after login (non-checkout).
 * Incomplete onboarding → /onboarding unless they previously skipped.
 */
export function postLoginDestination(user: AuthUserLike): "/onboarding" | "/check-in" {
  if (!user?.id) return "/check-in";
  if (user.onboarding_completed) return "/check-in";
  if (user.onboarding_skipped || hasSkippedOnboarding(user.id)) return "/check-in";
  return "/onboarding";
}

/** App routes that should yield to /onboarding when profile is incomplete. */
export function isOnboardingGatedPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  // Marketing home `/` stays open so incomplete users can still read the landing.
  // Core app shells require finish or skip first.
  if (p === "/check-in" || p.startsWith("/check-in/")) return true;
  if (p === "/routine" || p.startsWith("/routine/")) return true;
  if (p === "/progress" || p.startsWith("/progress/")) return true;
  if (p === "/cabinet" || p.startsWith("/cabinet/")) return true;
  if (p === "/wardrobe" || p.startsWith("/wardrobe/")) return true;
  return false;
}

/** Paths that must never be redirected away by the onboarding gate. */
export function isOnboardingGateExemptPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/onboarding" || p.startsWith("/onboarding/")) return true;
  if (p === "/privacy" || p.startsWith("/privacy/")) return true;
  if (p === "/settings" || p.startsWith("/settings/")) return true;
  if (p === "/login" || p.startsWith("/login/")) return true;
  if (p === "/register" || p.startsWith("/register/")) return true;
  if (p === "/pricing" || p.startsWith("/pricing/")) return true;
  if (p.startsWith("/payment/")) return true;
  if (p.startsWith("/admin")) return true;
  if (p === "/feedback" || p.startsWith("/feedback/")) return true;
  return false;
}
