"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { BillingToggle } from "@/components/pricing/billing-toggle";
import { CancelSubscriptionButton } from "@/components/pricing/cancel-subscription-button";
import { PricingCompare } from "@/components/pricing/pricing-compare";
import { PricingFaq } from "@/components/pricing/pricing-faq";
import { PricingPlanCard } from "@/components/pricing/pricing-plan-card";
import { useRouter } from "@/i18n/navigation";
import { getAccessToken } from "@/lib/auth-token";
import { useSePayCheckout } from "@/lib/hooks/use-sepay-checkout";
import {
  readCheckoutIntentFromSearch,
  wantsAutoCheckout,
} from "@/lib/premium/checkout-intent";
import { isPaidPlan, normalizePlanTier } from "@/lib/premium/features";
import { usePlanTier } from "@/lib/premium/plan-tier-context";
import type { BillingInterval } from "@/lib/premium/pricing";
import { YEARLY_SAVE_PERCENT } from "@/lib/premium/pricing";
import { useAuthStore } from "@/lib/stores/auth-store";

/** Client shell: billing interval state + plan cards + compare + FAQ. */
export function PricingView() {
  return (
    <Suspense fallback={<PricingViewFallback />}>
      <PricingViewInner />
    </Suspense>
  );
}

function PricingViewFallback() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
      <div className="mx-auto mb-10 h-10 max-w-md animate-pulse rounded-md bg-muted" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="h-80 animate-pulse rounded-2xl bg-muted" />
        <div className="h-80 animate-pulse rounded-2xl bg-muted" />
        <div className="h-80 animate-pulse rounded-2xl bg-muted" />
      </div>
    </div>
  );
}

function PricingViewInner() {
  const t = useTranslations("pricing");
  const router = useRouter();
  const searchParams = useSearchParams();
  const intent = useMemo(
    () => readCheckoutIntentFromSearch(searchParams),
    [searchParams],
  );
  const autoCheckout = useMemo(
    () => wantsAutoCheckout(searchParams),
    [searchParams],
  );

  const [interval, setInterval] = useState<BillingInterval>(
    () => intent?.interval ?? "yearly",
  );
  const user = useAuthStore((s) => s.user);
  const planSnap = usePlanTier();
  const { busy: checkoutBusy, busyPlan: checkoutBusyPlan, startCheckout } =
    useSePayCheckout();
  const isLoggedIn = !!user || !!getAccessToken();
  const currentPlan = isLoggedIn
    ? normalizePlanTier(planSnap.planTier ?? user?.plan_tier)
    : null;
  const showCancel =
    isLoggedIn && currentPlan != null && isPaidPlan(currentPlan);

  // Keep UI in sync when arriving with ?interval=
  useEffect(() => {
    if (intent?.interval) setInterval(intent.interval);
  }, [intent?.interval]);

  // After register/login with ?plan=&checkout=1 → start SePay once.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStarted.current) return;
    if (!autoCheckout || !intent || !isLoggedIn) return;
    if (currentPlan === intent.plan) {
      // Already on that plan — clean the URL, don't re-checkout.
      router.replace("/pricing");
      return;
    }
    autoStarted.current = true;
    const { plan, interval: checkoutInterval } = intent;
    // Strip ?checkout=1 before form POST so refresh/Back won't re-trigger.
    router.replace("/pricing");
    void startCheckout(plan, checkoutInterval);
  }, [
    autoCheckout,
    intent,
    isLoggedIn,
    currentPlan,
    startCheckout,
    router,
  ]);

  return (
    <div className="relative overflow-x-clip">
      {/* Soft skincare atmosphere — teal mist + blush, not flat fill */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[42rem] bg-[radial-gradient(ellipse_at_20%_0%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_55%),radial-gradient(ellipse_at_85%_10%,color-mix(in_oklab,var(--accent)_55%,transparent),transparent_50%),linear-gradient(to_bottom,color-mix(in_oklab,var(--background)_40%,transparent),var(--background))]"
        aria-hidden
      />

      <div className="mx-auto w-full max-w-6xl px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-10 sm:px-6 sm:pb-16 sm:pt-14 lg:py-20">
        <header className="mx-auto max-w-2xl space-y-3 text-center in-animate animate-in fade-in slide-in-from-bottom-2 duration-500 sm:space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/85">
            DaDiary
          </p>
          <h1 className="text-balance text-[1.75rem] font-semibold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            {t("heroTitle")}{" "}
            <span className="gradient-text">{t("heroTitleAccent")}</span>
          </h1>
          <p className="text-pretty text-[0.95rem] leading-relaxed text-muted-foreground sm:text-lg">
            {t("heroSub")}
          </p>
          {isLoggedIn && currentPlan ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-primary/90">
                {t("currentPlanLine", {
                  plan: t(`plans.${currentPlan}.name`),
                })}
              </p>
              {user?.days_left != null && user.days_left >= 0 && isPaidPlan(currentPlan) ? (
                <p className="text-xs text-muted-foreground">
                  {user.in_grace
                    ? t("graceLine", { days: user.days_left })
                    : t("daysLeftLine", { days: user.days_left })}
                </p>
              ) : null}
              {showCancel ? (
                <CancelSubscriptionButton
                  cancelAtPeriodEnd={!!user?.cancel_at_period_end}
                  className="pt-1"
                />
              ) : null}
            </div>
          ) : null}

          {/* Desktop / tablet toggle — mobile uses sticky bottom bar */}
          <div className="hidden flex-col items-center gap-2 pt-3 sm:flex">
            <BillingToggle value={interval} onChange={setInterval} />
            {interval === "yearly" ? (
              <p className="text-xs font-medium text-primary">
                {t("yearlyHint", { percent: YEARLY_SAVE_PERCENT })}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {t("monthlyHint", { percent: YEARLY_SAVE_PERCENT })}
              </p>
            )}
          </div>
        </header>

        {/* Mobile: Premium first (most popular). Desktop: Free | Premium | Plus */}
        <div className="mt-8 grid gap-6 sm:mt-12 sm:gap-5 lg:grid-cols-3 lg:items-stretch lg:gap-6">
          <PricingPlanCard
            plan="free"
            interval={interval}
            currentPlan={currentPlan}
            isLoggedIn={isLoggedIn}
            className="order-2 in-animate animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both lg:order-1"
          />
          <PricingPlanCard
            plan="premium"
            interval={interval}
            highlighted
            currentPlan={currentPlan}
            isLoggedIn={isLoggedIn}
            checkoutBusy={checkoutBusy}
            checkoutBusyPlan={checkoutBusyPlan}
            onCheckout={(plan) => void startCheckout(plan, interval)}
            className="order-1 in-animate animate-in fade-in slide-in-from-bottom-3 duration-500 delay-75 fill-mode-both lg:order-2"
          />
          <PricingPlanCard
            plan="premium_plus"
            interval={interval}
            currentPlan={currentPlan}
            isLoggedIn={isLoggedIn}
            checkoutBusy={checkoutBusy}
            checkoutBusyPlan={checkoutBusyPlan}
            onCheckout={(plan) => void startCheckout(plan, interval)}
            className="order-3 in-animate animate-in fade-in slide-in-from-bottom-3 duration-500 delay-150 fill-mode-both"
          />
        </div>

        <p className="mx-auto mt-5 max-w-md text-center text-xs leading-relaxed text-muted-foreground sm:mt-6">
          {t("trustLine")}
        </p>

        <div className="mt-14 sm:mt-20">
          <PricingCompare />
        </div>

        <div className="mt-14 sm:mt-20">
          <PricingFaq />
        </div>

        <p className="mx-auto mt-10 max-w-lg text-center text-xs leading-relaxed text-muted-foreground sm:mt-12">
          {t("legalNote")}
        </p>
      </div>

      {/*
        Mobile sticky billing — z-[60] sits above PWA install/update toasts (z-50)
        so Monthly/Yearly stays tappable. Opaque bg avoids bleed over page content.
      */}
      <div
        role="region"
        aria-label={t("toggle.aria")}
        className="fixed inset-x-0 bottom-0 z-[60] border-t border-border/60 bg-background px-4 pt-2.5 pb-[max(0.65rem,env(safe-area-inset-bottom))] shadow-[0_-8px_30px_-12px_rgba(0,0,0,0.14)] sm:hidden"
      >
        <div className="mx-auto flex max-w-md flex-col items-center gap-1.5">
          <BillingToggle
            value={interval}
            onChange={setInterval}
            fullWidth
            className="w-full"
          />
          {interval === "yearly" ? (
            <p className="text-[11px] font-medium text-primary">
              {t("yearlyHint", { percent: YEARLY_SAVE_PERCENT })}
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              {t("monthlyHint", { percent: YEARLY_SAVE_PERCENT })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
