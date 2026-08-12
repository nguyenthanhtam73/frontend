"use client";

import { usePathname } from "@/i18n/navigation";
import { getAccessToken } from "@/lib/auth-token";
import { isMarketingPath } from "@/lib/site-nav";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useClientMounted } from "@/lib/use-client-mounted";

/**
 * Same guest-chrome rule for header + footer:
 * short funnel on marketing pages when there is no session; product nav on
 * app routes, while a token is hydrating, or once the user is signed in.
 */
export function useShowGuestNav() {
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const mounted = useClientMounted();
  const awaitingSession = mounted && !user && Boolean(getAccessToken());
  return isMarketingPath(pathname) && !user && !awaitingSession;
}
