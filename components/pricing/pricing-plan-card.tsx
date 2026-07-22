"use client";

import { Check, Loader2, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import type { PlanTier } from "@/lib/premium/features";
import {
  formatVnd,
  priceForDisplay,
  YEARLY_SAVE_PERCENT,
  type BillingInterval,
  type PricedPlan,
} from "@/lib/premium/pricing";
import { cn } from "@/lib/utils";

type PricingPlanCardProps = {
  plan: PlanTier;
  interval: BillingInterval;
  highlighted?: boolean;
  /** User's current plan when logged in (undefined = guest). */
  currentPlan?: PlanTier | null;
  isLoggedIn?: boolean;
  /** SePay checkout in progress for this (or any) plan. */
  checkoutBusy?: boolean;
  checkoutBusyPlan?: PricedPlan | null;
  onCheckout?: (plan: PricedPlan) => void;
  className?: string;
};

const PLAN_FEATURES: Record<PlanTier, readonly string[]> = {
  free: ["f1", "f2", "f3", "f4"],
  premium: ["f1", "f2", "f3", "f4", "f5"],
  premium_plus: ["f1", "f2", "f3", "f4", "f5"],
};

const PLAN_RANK: Record<PlanTier, number> = {
  free: 0,
  premium: 1,
  premium_plus: 2,
};

export function PricingPlanCard({
  plan,
  interval,
  highlighted,
  currentPlan = null,
  isLoggedIn = false,
  checkoutBusy = false,
  checkoutBusyPlan = null,
  onCheckout,
  className,
}: PricingPlanCardProps) {
  const t = useTranslations(`pricing.plans.${plan}`);
  const tCommon = useTranslations("pricing");
  const locale = useLocale();
  const price = priceForDisplay(plan, interval);
  const featureKeys = PLAN_FEATURES[plan];

  const isCurrent = isLoggedIn && currentPlan === plan;
  const isDowngrade =
    isLoggedIn &&
    currentPlan != null &&
    PLAN_RANK[plan] < PLAN_RANK[currentPlan];

  const thisCardBusy = checkoutBusyPlan === plan;
  const cta = resolveCta({
    plan,
    isLoggedIn,
    isCurrent,
    isDowngrade,
    tPlan: t,
    tCommon,
  });

  const isPlus = plan === "premium_plus";
  // Highlighted Premium gets the strong lift — muted when it's also the current plan.
  const showPopularLift = highlighted && !isCurrent;

  return (
    <article
      data-testid={`pricing-card-${plan}`}
      className={cn(
        "relative flex h-full flex-col rounded-2xl border bg-card/80 p-5 backdrop-blur-sm transition-[transform,box-shadow,border-color] duration-300 ease-out sm:p-6",
        "motion-safe:hover:-translate-y-0.5",
        showPopularLift
          ? [
              "z-[1] border-primary/55",
              "bg-gradient-to-b from-primary/[0.1] via-card to-accent/25",
              "shadow-[0_12px_40px_-12px_color-mix(in_oklab,var(--primary)_45%,transparent)]",
              "ring-2 ring-primary/35",
              "scale-[1.02] sm:scale-[1.03] sm:-translate-y-1",
              "motion-safe:hover:shadow-[0_16px_48px_-12px_color-mix(in_oklab,var(--primary)_55%,transparent)]",
              "motion-safe:hover:ring-primary/45",
            ]
          : isPlus
            ? [
                "border-accent-foreground/25",
                "bg-gradient-to-b from-accent/55 via-card/90 to-card",
                "shadow-sm shadow-accent-foreground/10",
                "hover:border-accent-foreground/40 hover:shadow-md",
              ]
            : [
                "border-border/70 shadow-sm",
                "hover:border-primary/30 hover:shadow-md",
              ],
        // Current plan: calm ring, no popular scale/shadow competition
        isCurrent && "z-[1] border-primary/40 ring-2 ring-primary/30 shadow-sm",
        className,
      )}
    >
      {isCurrent ? (
        <Badge
          variant="default"
          className="absolute -top-3 left-1/2 z-[2] -translate-x-1/2 gap-1 rounded-full border border-primary/20 bg-primary/12 px-3.5 py-1 text-[11px] font-semibold text-primary shadow-sm"
        >
          {tCommon("currentPlanBadge")}
        </Badge>
      ) : highlighted ? (
        <Badge
          variant="outline"
          className="absolute -top-3.5 left-1/2 z-[2] -translate-x-1/2 gap-1 rounded-full border-transparent bg-primary px-3.5 py-1.5 text-[11px] font-bold tracking-wide text-primary-foreground shadow-md shadow-primary/35"
        >
          <Sparkles className="size-3.5 shrink-0" aria-hidden />
          {tCommon("mostPopular")}
        </Badge>
      ) : null}

      <header className="space-y-2 pb-4 pt-1">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/85">
          {t("name")}
        </p>
        <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{t("tagline")}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("blurb")}</p>
      </header>

      <div className="pb-5">
        {plan === "free" ? (
          <p className="flex items-baseline gap-1">
            <span className="text-4xl font-semibold tracking-tight">{tCommon("freePrice")}</span>
          </p>
        ) : (
          <div className="space-y-1">
            <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
              <span className="text-3xl font-semibold tracking-tight tabular-nums transition-[opacity,transform] duration-200 sm:text-4xl">
                {formatVnd(price.perMonth, locale)}
              </span>
              <span className="text-sm text-muted-foreground">{tCommon("perMonth")}</span>
            </p>
            {interval === "yearly" ? (
              <p className="text-xs text-muted-foreground">
                {tCommon("billedYearly", {
                  amount: formatVnd(price.billedTotal, locale),
                  percent: YEARLY_SAVE_PERCENT,
                })}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{tCommon("billedMonthly")}</p>
            )}
          </div>
        )}
      </div>

      <ul className="mb-6 flex flex-1 flex-col gap-2.5 sm:gap-3">
        {featureKeys.map((key) => (
          <li key={key} className="flex gap-2.5 text-sm leading-snug">
            <span
              className={cn(
                "mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full transition-colors duration-200",
                showPopularLift || isCurrent
                  ? "bg-primary/15 text-primary"
                  : isPlus
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground",
              )}
              aria-hidden
            >
              <Check className="size-3" strokeWidth={2.5} />
            </span>
            <span>{t(`features.${key}`)}</span>
          </li>
        ))}
      </ul>

      {cta.kind === "disabled" ? (
        <Button
          type="button"
          size="lg"
          variant="outline"
          disabled
          data-testid={`pricing-cta-${plan}`}
          className="h-12 w-full text-base font-semibold sm:h-[3.25rem]"
        >
          {cta.label}
        </Button>
      ) : cta.kind === "checkout" ? (
        <Button
          type="button"
          size="lg"
          variant={highlighted ? "default" : "secondary"}
          disabled={checkoutBusy || !onCheckout}
          aria-busy={thisCardBusy}
          data-testid={`pricing-cta-${plan}`}
          className={cn(
            "h-12 w-full touch-manipulation text-base font-semibold transition-[transform,box-shadow,background-color] duration-200 sm:h-[3.25rem]",
            highlighted &&
              "shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/35 active:scale-[0.98]",
          )}
          onClick={() => {
            if (plan === "free" || !onCheckout) return;
            onCheckout(plan);
          }}
        >
          {thisCardBusy ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {tCommon("checkout.redirecting")}
            </>
          ) : (
            cta.label
          )}
        </Button>
      ) : (
        <ButtonLink
          href={cta.href}
          size="lg"
          variant={
            highlighted && !isCurrent
              ? "default"
              : plan === "free"
                ? "outline"
                : "secondary"
          }
          className={cn(
            "h-12 w-full touch-manipulation text-base font-semibold transition-[transform,box-shadow,background-color] duration-200 sm:h-[3.25rem]",
            highlighted &&
              !isCurrent &&
              "shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/35 active:scale-[0.98]",
          )}
        >
          {cta.label}
        </ButtonLink>
      )}
    </article>
  );
}

function resolveCta({
  plan,
  isLoggedIn,
  isCurrent,
  isDowngrade,
  tPlan,
  tCommon,
}: {
  plan: PlanTier;
  isLoggedIn: boolean;
  isCurrent: boolean;
  isDowngrade: boolean;
  tPlan: ReturnType<typeof useTranslations>;
  tCommon: ReturnType<typeof useTranslations>;
}):
  | { kind: "disabled"; label: string }
  | { kind: "checkout"; label: string }
  | {
      kind: "link";
      href: "/register" | "/routine" | `/register?plan=${PlanTier}`;
      label: string;
    } {
  if (isCurrent) {
    return { kind: "disabled", label: tCommon("currentPlanCta") };
  }
  if (isDowngrade) {
    return { kind: "disabled", label: tCommon("downgradeCta") };
  }
  if (plan === "free") {
    if (isLoggedIn) {
      return { kind: "link", href: "/routine", label: tCommon("continueFreeCta") };
    }
    return { kind: "link", href: "/register", label: tPlan("cta") };
  }
  // Paid tiers — logged-in users go to SePay; guests register first.
  if (isLoggedIn) {
    return { kind: "checkout", label: tCommon("upgradeCta") };
  }
  return {
    kind: "link",
    href: `/register?plan=${plan}`,
    label: tCommon("upgradeCta"),
  };
}
