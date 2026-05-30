"use client";

import { useEffect, useState } from "react";

import { usePrivacyStore } from "@/lib/stores/privacy-store";

/**
 * Becomes true once the persisted privacy store has rehydrated from
 * `localStorage`. Until then, treat persisted fields as their SSR defaults
 * so server HTML and the hydration pass stay aligned.
 */
export function usePrivacyHydrated() {
  const [hydrated, setHydrated] = useState(() => usePrivacyStore.persist.hasHydrated());

  useEffect(() => {
    const unsub = usePrivacyStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(usePrivacyStore.persist.hasHydrated());
    return unsub;
  }, []);

  return hydrated;
}
