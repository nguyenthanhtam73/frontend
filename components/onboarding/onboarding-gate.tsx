"use client";

import { useEffect } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import {
  isOnboardingGateExemptPath,
  isOnboardingGatedPath,
} from "@/lib/onboarding/post-auth-destination";
import { hasSkippedOnboarding } from "@/lib/onboarding/skip";
import { getAccessToken } from "@/lib/auth-token";
import { useAuthStore } from "@/lib/stores/auth-store";

/**
 * Client equivalent of an onboarding middleware gate.
 * JWT lives in localStorage, so Next middleware cannot enforce this.
 * Relies on SiteHeader (or login) to populate auth store — does not call /me itself.
 */
export function OnboardingGate() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  useEffect(() => {
    if (loading) return;
    if (!getAccessToken() || !user?.id) return;
    if (user.onboarding_completed) return;
    if (user.onboarding_skipped || hasSkippedOnboarding(user.id)) return;
    if (isOnboardingGateExemptPath(pathname)) return;
    if (!isOnboardingGatedPath(pathname)) return;
    router.replace("/onboarding");
  }, [loading, user, pathname, router]);

  return null;
}
