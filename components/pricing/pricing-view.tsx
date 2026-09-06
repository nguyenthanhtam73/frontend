"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";

import { BillingToggle } from "@/components/pricing/billing-toggle";
import { CancelSubscriptionButton } from "@/components/pricing/cancel-subscription-button";
import { CheckoutPlanSummary } from "@/components/pricing/checkout-plan-summary";
import { PricingCompare } from "@/components/pricing/pricing-compare";
import { PricingFaq } from "@/components/pricing/pricing-faq";
import { PricingPlanCard } from "@/components/pricing/pricing-plan-card";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { getAccessToken } from "@/lib/auth-token";
import { useSePayCheckout } from "@/lib/hooks/use-sepay-checkout";
import {
  persistCheckoutIntent,
  wantsAutoCheckout,
} from "@/lib/premium/checkout-intent";
import { useCheckoutIntent } from "@/lib/premium/use-checkout-intent";
import {
  isPaidPlan,
  normalizePlanTier,
  type FeatureId,
} from "@/lib/premium/features";
import { isSePayCheckoutEnabled } from "@/lib/premium/payments-enabled";
import { usePlanTier } from "@/lib/premium/plan-tier-context";
import type { BillingInterval } from "@/lib/premium/pricing";
import { YEARLY_SAVE_PERCENT } from "@/lib/premium/pricing";
import {
  readUpsellFeatureFromSearch,
  recommendedPlanForFeature,
} from "@/lib/premium/upsell-href";
import { reportPaywallView } from "@/lib/analytics/funnel";
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
  const intent = useCheckoutIntent(searchParams);
  const autoCheckout = useMemo(
    () => wantsAutoCheckout(searchParams),
    [searchParams],
  );
  const upsellFrom = useMemo(
    () => readUpsellFeatureFromSearch(searchParams),
    [searchParams],
  );
  const highlightPlan = recommendedPlanForFeature(upsellFrom ?? undefined);

  useEffect(() => {
    const feature = upsellFrom ?? "generic";
    reportPaywallView(
      {
        surface: "pricing",
        feature,
        recommendedPlan: highlightPlan,
      },
      `pricing:${feature}`,
    );
  }, [highlightPlan, upsellFrom]);

  const [interval, setInterval] = useState<BillingInterval>(
    () => intent?.interval ?? "yearly",
  );
  const user = useAuthStore((s) => s.user);
  const planSnap = usePlanTier();
  const checkoutEnabled = isSePayCheckoutEnabled();
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

  useEffect(() => {
    if (!intent) return;
    persistCheckoutIntent({ plan: intent.plan, interval });
  }, [intent, interval]);

  // After register/login with ?checkout=1: keep plan selected and show confirm.
  // Do not silent-POST to SePay — users should see price + interval first.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const cleanedUrl = useRef(false);
  useEffect(() => {
    if (cleanedUrl.current) return;
    if (!checkoutEnabled) {
      if (autoCheckout || intent) {
        cleanedUrl.current = true;
        persistCheckoutIntent(null);
        router.replace("/pricing");
      }
      return;
    }
    if (!intent) return;
    persistCheckoutIntent(intent);
    if (!autoCheckout || !isLoggedIn) return;
    if (currentPlan === intent.plan) {
      cleanedUrl.current = true;
      persistCheckoutIntent(null);
      router.replace("/pricing");
      return;
    }
    cleanedUrl.current = true;
    setConfirmOpen(true);
    router.replace(`/pricing?plan=${intent.plan}&interval=${intent.interval}`);
  }, [checkoutEnabled, autoCheckout, intent, isLoggedIn, currentPlan, router]);

  function confirmUpgrade() {
    if (!intent) return;
    setConfirmOpen(false);
    persistCheckoutIntent(null);
    void startCheckout(intent.plan, interval);
  }

  return (
    <div className="relative overflow-x-clip">
      <div className="mx-auto w-full max-w-6xl px-4 pb-[calc(7.25rem+env(safe-area-inset-bottom))] pt-10 sm:px-6 sm:pb-16 sm:pt-14 lg:py-20">
        <header className="mx-auto max-w-2xl space-y-3 text-center in-animate animate-in fade-in slide-in-from-bottom-2 duration-500 sm:space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/85">
            DaDiary
          </p>
          <h1 className="text-balance text-[1.75rem] font-semibold leading-tight tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            {t("heroTitle")}{" "}
            <span className="gradient-text">{t("heroTitleAccent")}</span>
          </h1>
          <p className="text-pretty text-[0.95rem] leading-relaxed text-muted-foreground sm:text-lg">
            {checkoutEnabled ? t("heroSub") : t("heroSubBeta")}
          </p>
          {upsellFrom ? (
            <p
              data-testid="pricing-from-context"
              className="mx-auto max-w-lg rounded-xl border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-sm leading-relaxed text-amber-950 dark:border-amber-500/25 dark:bg-amber-950/40 dark:text-amber-50"
            >
              {fromContextCopy(t, upsellFrom)}
            </p>
          ) : null}
          {!checkoutEnabled ? (
            <p
              data-testid="pricing-beta-banner"
              className="mx-auto max-w-lg rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm leading-relaxed text-foreground/90"
            >
              {t("betaInviteBanner")}
            </p>
          ) : null}
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

        {confirmOpen && intent && checkoutEnabled ? (
          <div
            data-testid="checkout-confirm"
            className="mx-auto mt-8 max-w-md space-y-3 rounded-2xl border border-primary/30 bg-card p-4 shadow-sm sm:mt-10"
          >
            <h2 className="text-center text-base font-semibold tracking-tight">
              {t("confirm.title")}
            </h2>
            <p className="text-center text-sm leading-relaxed text-muted-foreground">
              {t("confirm.body")}
            </p>
            <CheckoutPlanSummary intent={{ plan: intent.plan, interval }} />
            <Button
              type="button"
              size="lg"
              className="h-12 w-full text-base font-semibold"
              disabled={checkoutBusy}
              onClick={confirmUpgrade}
            >
              {checkoutBusy ? t("checkout.redirecting") : t("confirm.cta")}
            </Button>
            <button
              type="button"
              className="mx-auto block text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
              onClick={() => setConfirmOpen(false)}
            >
              {t("confirm.later")}
            </button>
          </div>
        ) : null}

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
            highlighted={highlightPlan === "premium"}
            currentPlan={currentPlan}
            isLoggedIn={isLoggedIn}
            checkoutEnabled={checkoutEnabled}
            checkoutBusy={checkoutBusy}
            checkoutBusyPlan={checkoutBusyPlan}
            onCheckout={
              checkoutEnabled
                ? (plan) => void startCheckout(plan, interval)
                : undefined
            }
            className="order-1 in-animate animate-in fade-in slide-in-from-bottom-3 duration-500 delay-75 fill-mode-both lg:order-2"
          />
          <PricingPlanCard
            plan="premium_plus"
            interval={interval}
            highlighted={highlightPlan === "premium_plus"}
            currentPlan={currentPlan}
            isLoggedIn={isLoggedIn}
            checkoutEnabled={checkoutEnabled}
            checkoutBusy={checkoutBusy}
            checkoutBusyPlan={checkoutBusyPlan}
            onCheckout={
              checkoutEnabled
                ? (plan) => void startCheckout(plan, interval)
                : undefined
            }
            className="order-3 in-animate animate-in fade-in slide-in-from-bottom-3 duration-500 delay-150 fill-mode-both"
          />
        </div>

        <p
          data-testid="pricing-plus-note"
          className="mx-auto mt-5 max-w-lg text-center text-sm leading-relaxed text-foreground/80 sm:mt-6"
        >
          {t("plusNote")}
        </p>

        <p className="mx-auto mt-3 max-w-md text-center text-xs leading-relaxed text-muted-foreground">
          {checkoutEnabled ? t("trustLine") : t("trustLineBeta")}
        </p>

        <div className="mt-14 sm:mt-20">
          <PricingCompare />
        </div>

        <div className="mt-14 sm:mt-20">
          <PricingFaq />
        </div>

        <p className="mx-auto mt-10 max-w-lg text-center text-xs leading-relaxed text-muted-foreground sm:mt-12">
          {checkoutEnabled ? t("legalNote") : t("legalNoteBeta")}
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

const FROM_CONTEXT_KEYS: Partial<Record<FeatureId, string>> = {
  ai_routine_suggestion: "fromContext.ai_routine_suggestion",
  edit_routine: "fromContext.edit_routine",
  wardrobe_full: "fromContext.wardrobe_full",
  progress_full_history: "fromContext.progress_full_history",
  advanced_skin_analysis: "fromContext.advanced_skin_analysis",
};

function fromContextCopy(
  t: ReturnType<typeof useTranslations>,
  feature: FeatureId,
): string {
  const key = FROM_CONTEXT_KEYS[feature];
  return key ? t(key) : t("fromContext.generic");
}
