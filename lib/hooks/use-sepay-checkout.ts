"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { useToast } from "@/hooks/use-toast";
import {
  createSePayCheckout,
  sePayCheckoutErrorKey,
  submitSePayCheckoutForm,
} from "@/lib/api/payment";
import { rememberMetaCheckout, trackMetaEvent } from "@/lib/meta-pixel";
import { isSePayCheckoutEnabled } from "@/lib/premium/payments-enabled";
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
      if (!isSePayCheckoutEnabled()) {
        toastError({
          title: t("errorTitle"),
          description: t("errorUnavailable"),
        });
        return;
      }
      inflight.current = true;
      setBusyPlan(plan);
      try {
        const data = await createSePayCheckout(plan, interval, { locale });
        rememberMetaCheckout({
          value: Number(data.amount_vnd),
          currency: data.currency || "VND",
          contentName: data.plan_tier,
          invoice: data.invoice_number,
        });
        trackMetaEvent("InitiateCheckout", {
          value: Number(data.amount_vnd),
          currency: (data.currency || "VND").toUpperCase(),
          content_name: data.plan_tier,
          num_items: 1,
        });
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
