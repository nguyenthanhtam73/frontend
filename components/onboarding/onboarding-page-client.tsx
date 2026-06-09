"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";

import { OnboardingFlowSkeleton } from "@/components/onboarding/onboarding-flow-skeleton";
import { OnboardingReview } from "@/components/onboarding/onboarding-review";
import { fetchSkinProfile } from "@/lib/api/profile";
import {
  buildReviewFromProfile,
  loadGuestReviewFromSession,
  type OnboardingReviewData,
} from "@/lib/onboarding/review-data";
import { isOnboardingComplete } from "@/lib/onboarding/snapshot";
import { getAccessToken } from "@/lib/auth-token";
import { AUTH_CHANGED_EVENT } from "@/lib/auth-token";
import { useRouter } from "@/i18n/navigation";
import { hasJustCompletedOnboarding } from "@/lib/stores/onboarding-store";

const OnboardingFlow = dynamic(
  () =>
    import("@/components/onboarding/onboarding-flow").then((m) => ({
      default: m.OnboardingFlow,
    })),
  { loading: () => <OnboardingFlowSkeleton /> },
);

type PageMode = "loading" | "review" | "flow" | "redirecting";

export function OnboardingPageClient() {
  const router = useRouter();
  const [mode, setMode] = useState<PageMode>("loading");
  const [reviewData, setReviewData] = useState<OnboardingReviewData | null>(null);

  const resolveMode = useCallback(async () => {
    if (hasJustCompletedOnboarding()) {
      setMode("redirecting");
      router.replace("/onboarding/coach-welcome");
      return;
    }

    setMode("loading");
    const token = getAccessToken();
    if (token) {
      try {
        const profile = await fetchSkinProfile();
        if (profile && isOnboardingComplete(profile)) {
          setReviewData(buildReviewFromProfile(profile));
          setMode("review");
          return;
        }
      } catch {
        /* fall through to onboarding flow */
      }
      setReviewData(null);
      setMode("flow");
      return;
    }

    const guestReview = loadGuestReviewFromSession();
    if (guestReview) {
      setReviewData(guestReview);
      setMode("review");
      return;
    }

    setReviewData(null);
    setMode("flow");
  }, [router]);

  useEffect(() => {
    void resolveMode();
    const onAuthChanged = () => void resolveMode();
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
  }, [resolveMode]);

  if (mode === "loading" || mode === "redirecting") {
    return <OnboardingFlowSkeleton />;
  }

  if (mode === "review" && reviewData) {
    return (
      <OnboardingReview
        data={reviewData}
        onDeleted={() => {
          setReviewData(null);
          setMode("flow");
        }}
      />
    );
  }

  return <OnboardingFlow />;
}
