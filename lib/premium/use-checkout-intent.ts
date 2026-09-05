"use client";

import { useEffect, useMemo, useState } from "react";

import {
  parseCheckoutIntent,
  persistCheckoutIntent,
  readPersistedCheckoutIntent,
  type CheckoutIntent,
} from "@/lib/premium/checkout-intent";

type SearchLike = { get: (key: string) => string | null };

/**
 * URL intent is available on SSR. SessionStorage is applied after mount
 * so a header /register hop still restores the plan without a hydration mismatch.
 */
export function useCheckoutIntent(search: SearchLike): CheckoutIntent | null {
  const plan = search.get("plan");
  const interval = search.get("interval");
  const fromUrl = useMemo(
    () => parseCheckoutIntent(plan, interval),
    [plan, interval],
  );
  const [fromStore, setFromStore] = useState<CheckoutIntent | null>(null);

  useEffect(() => {
    if (fromUrl) {
      persistCheckoutIntent(fromUrl);
      setFromStore(fromUrl);
      return;
    }
    setFromStore(readPersistedCheckoutIntent());
  }, [fromUrl]);

  return fromUrl ?? fromStore;
}
