"use client";

import { useEffect, useRef } from "react";

import { hasNeverCheckedIn } from "@/lib/activation/first-check-in";
import {
  FIRST_PARTY_FUNNEL_EVENTS,
  sendFunnelEvent,
  type CheckInFunnelContext,
} from "@/lib/analytics/funnel-events";
import { getAccessToken, getRefreshToken } from "@/lib/auth-token";
import { useStreak } from "@/lib/hooks/use-streak";
import { usePrivacyStore } from "@/lib/stores/privacy-store";
import { useAuthStore } from "@/lib/stores/auth-store";
import { usePrivacyHydrated } from "@/lib/use-privacy-hydrated";

/** Fires `checkin_page_view` once when /check-in is ready to describe the visitor. */
export function CheckInPageView() {
  const sent = useRef(false);
  const user = useAuthStore((s) => s.user);
  const signedIn = Boolean(user || getAccessToken() || getRefreshToken());
  const privacyHydrated = usePrivacyHydrated();
  const skipFaceCapture = usePrivacyStore((s) => s.skipFaceCapture);
  const streakQuery = useStreak();

  useEffect(() => {
    if (sent.current) return;
    if (!privacyHydrated) return;
    if (signedIn && streakQuery.isLoading) return;
    sent.current = true;
    const props: CheckInFunnelContext = {
      never_checked_in: hasNeverCheckedIn(streakQuery.data),
      skip_mode: privacyHydrated && skipFaceCapture,
      signed_in: signedIn,
    };
    sendFunnelEvent(FIRST_PARTY_FUNNEL_EVENTS.checkInPageView, props);
  }, [
    privacyHydrated,
    signedIn,
    skipFaceCapture,
    streakQuery.data,
    streakQuery.isLoading,
  ]);

  return null;
}
