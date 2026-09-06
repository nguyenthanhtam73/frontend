import { hasSkippedOnboarding } from "@/lib/onboarding/skip";

/** Keep in sync with `GUEST_CLAIM_RETURN_PATH` — avoid importing the claim module. */
const COACH_WELCOME_PATH = "/onboarding/coach-welcome";

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

/**
 * Honor `?next=` after auth, but never dump incomplete users onto gated
 * surfaces (routine / progress / …) — OnboardingGate would bounce them.
 * `/check-in` is intentionally open: D0/D1 CTAs all point there.
 */
export function resolveAuthReturnDestination(
  user: AuthUserLike,
  returnPath: string | null | undefined,
): string {
  const fallback = postLoginDestination(user);
  if (!returnPath) return fallback;

  const incomplete =
    Boolean(user?.id) &&
    !user?.onboarding_completed &&
    !(user?.onboarding_skipped || (user?.id ? hasSkippedOnboarding(user.id) : false));

  const bare = returnPath.split("?")[0]?.split("#")[0] || returnPath;
  if (incomplete && isOnboardingGatedPath(bare)) {
    return "/onboarding";
  }
  return returnPath;
}

/** App routes that should yield to /onboarding when profile is incomplete. */
export function isOnboardingGatedPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  // Marketing home `/` stays open so incomplete users can still read the landing.
  // Check-in is the D0 activation action — do not bounce it back to onboarding.
  // Other core shells still require finish or skip first.
  if (p === "/routine" || p.startsWith("/routine/")) return true;
  if (p === "/progress" || p.startsWith("/progress/")) return true;
  if (p === "/cabinet" || p.startsWith("/cabinet/")) return true;
  if (p === "/wardrobe" || p.startsWith("/wardrobe/")) return true;
  return false;
}

/**
 * Where to send the user after a successful register (non-checkout).
 * Claimed guest trial → coach-welcome (check-in is the primary CTA there).
 * Otherwise → /check-in (or an explicit non-gated `?next=`).
 */
export function postRegisterDestination(input: {
  claimed: boolean;
  hadClaimableGuest: boolean;
  user: AuthUserLike;
  returnPath: string | null | undefined;
}): string {
  if (input.claimed || input.hadClaimableGuest) return COACH_WELCOME_PATH;
  if (!input.returnPath) return "/check-in";
  return resolveAuthReturnDestination(input.user, input.returnPath);
}

/** Paths that must never be redirected away by the onboarding gate. */
export function isOnboardingGateExemptPath(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, "") || "/";
  if (p === "/onboarding" || p.startsWith("/onboarding/")) return true;
  if (p === "/privacy" || p.startsWith("/privacy/")) return true;
  if (p === "/terms" || p.startsWith("/terms/")) return true;
  if (p === "/settings" || p.startsWith("/settings/")) return true;
  if (p === "/login" || p.startsWith("/login/")) return true;
  if (p === "/register" || p.startsWith("/register/")) return true;
  if (p === "/pricing" || p.startsWith("/pricing/")) return true;
  if (p.startsWith("/payment/")) return true;
  if (p.startsWith("/admin")) return true;
  if (p === "/feedback" || p.startsWith("/feedback/")) return true;
  return false;
}
