"use client";

import { useEffect, useState } from "react";

import {
  fetchOnboardingProductGuidance,
  type OnboardingProductGuidanceResult,
} from "@/lib/api/onboarding-guidance";

/**
 * Answers are stable within an onboarding session, so a module-level cache keeps
 * stepping back and forth between steps from re-hitting the endpoint.
 */
const cache = new Map<string, OnboardingProductGuidanceResult>();

function cacheKey(
  locale: string,
  goal: string | null,
  skinType: string | null,
  concerns: string[],
): string {
  return [locale, goal ?? "", skinType ?? "", [...concerns].sort().join(",")].join("|");
}

export type ManualProductGuidance = {
  result: OnboardingProductGuidanceResult | null;
  loading: boolean;
};

/**
 * Product guidance for onboarding step 2 when there is no photo analysis to read
 * it from. Disabled (and never fetched) when analyze-skin already supplied it.
 */
export function useManualProductGuidance({
  enabled,
  locale,
  goal,
  skinType,
  concerns,
}: {
  enabled: boolean;
  locale: string;
  goal: string | null;
  skinType: string | null;
  concerns: string[];
}): ManualProductGuidance {
  const key = cacheKey(locale, goal, skinType, concerns);
  const [result, setResult] = useState<OnboardingProductGuidanceResult | null>(
    () => (enabled ? (cache.get(key) ?? null) : null),
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setResult(null);
      setLoading(false);
      return;
    }
    const cached = cache.get(key);
    if (cached) {
      setResult(cached);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    let active = true;
    setLoading(true);
    void fetchOnboardingProductGuidance(
      { locale, goal, skinType, concerns },
      controller.signal,
    ).then((res) => {
      if (!active) return;
      if (res) cache.set(key, res);
      setResult(res);
      setLoading(false);
    });

    return () => {
      active = false;
      controller.abort();
    };
    // `key` already encodes locale/goal/skinType/concerns; listing the array itself
    // would refetch on every render since the store returns a new reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, key]);

  return { result, loading };
}
