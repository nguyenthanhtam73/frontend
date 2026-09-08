"use client";

import { usePathname } from "@/i18n/navigation";
import { getAccessToken } from "@/lib/auth-token";
import { isMarketingPath } from "@/lib/site-nav";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useClientMounted } from "@/lib/use-client-mounted";

/**
 * Session for chrome (header/footer): a hydrated user, or a token still
 * hydrating so we do not flash guest/slim funnel chrome after login.
 */
export function useHasAppSession() {
  const user = useAuthStore((s) => s.user);
  const mounted = useClientMounted();
  const awaitingSession = mounted && !user && Boolean(getAccessToken());
  return Boolean(user) || awaitingSession;
}

/**
 * Same guest-chrome rule for header + footer:
 * short funnel on marketing pages when there is no session; product nav on
 * app routes, while a token is hydrating, or once the user is signed in.
 */
export function useShowGuestNav() {
  const pathname = usePathname();
  const hasSession = useHasAppSession();
  return isMarketingPath(pathname) && !hasSession;
}
