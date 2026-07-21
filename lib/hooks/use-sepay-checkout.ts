"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { useToast } from "@/hooks/use-toast";
import {
  createSePayCheckout,
  sePayCheckoutErrorKey,
  submitSePayCheckoutForm,
} from "@/lib/api/payment";
import type { BillingInterval, PricedPlan } from "@/lib/premium/pricing";

type UseSePayCheckoutResult = {
  /** True while calling API / about to navigate to SePay. */
  busy: boolean;
  /** Plan currently being checked out (for per-card loading UI). */
  busyPlan: PricedPlan | null;
  /** Start checkout → API → auto POST form to SePay. */
  startCheckout: (plan: PricedPlan, interval: BillingInterval) => Promise<void>;
};

/**
 * Pricing upgrade flow: create SePay order, then auto-submit the signed form.
 * Resets busy when the user returns via Back / bfcache (pageshow).
 */
export function useSePayCheckout(): UseSePayCheckoutResult {
  const t = useTranslations("pricing.checkout");
  const locale = useLocale();
  const { error: toastError } = useToast();
  const [busyPlan, setBusyPlan] = useState<PricedPlan | null>(null);
  const inflight = useRef(false);

  const resetBusy = useCallback(() => {
    inflight.current = false;
    setBusyPlan(null);
  }, []);

  useEffect(() => {
    // Back from SePay often restores bfcache with busy=true — clear it.
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) resetBusy();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [resetBusy]);

  const startCheckout = useCallback(
    async (plan: PricedPlan, interval: BillingInterval) => {
      if (inflight.current) return;
      inflight.current = true;
      setBusyPlan(plan);
      try {
        const data = await createSePayCheckout(plan, interval, { locale });
        submitSePayCheckoutForm(data.checkout_url, data.form_fields);
        // If navigation is blocked, clear busy so the user can retry.
        window.setTimeout(() => {
          if (document.visibilityState === "visible") {
            resetBusy();
          }
        }, 2500);
      } catch (err) {
        const key = sePayCheckoutErrorKey(err);
        toastError({
          title: t("errorTitle"),
          description: t(key as "errorGeneric"),
        });
        resetBusy();
      }
    },
    [locale, t, toastError, resetBusy],
  );

  return {
    busy: busyPlan != null,
    busyPlan,
    startCheckout,
  };
}
