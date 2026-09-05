"use client";

import { useLocale, useTranslations } from "next-intl";

import type { CheckoutIntent } from "@/lib/premium/checkout-intent";
import {
  formatVnd,
  priceForDisplay,
  YEARLY_SAVE_PERCENT,
} from "@/lib/premium/pricing";
import { cn } from "@/lib/utils";

type CheckoutPlanSummaryProps = {
  intent: CheckoutIntent;
  className?: string;
  /** Extra line under the price (register vs pricing confirm). */
  footnote?: string;
};

/** Visible plan + price + billing interval — used on register/login and upgrade confirm. */
export function CheckoutPlanSummary({
  intent,
  className,
  footnote,
}: CheckoutPlanSummaryProps) {
  const t = useTranslations("pricing");
  const locale = useLocale();
  const price = priceForDisplay(intent.plan, intent.interval);
  const planName = t(`plans.${intent.plan}.name`);
  const intervalLabel =
    intent.interval === "yearly" ? t("toggle.yearly") : t("toggle.monthly");

  return (
    <aside
      data-testid="checkout-plan-summary"
      aria-label={t("summary.aria", { plan: planName, interval: intervalLabel })}
      className={cn(
        "rounded-2xl border border-primary/25 bg-primary/[0.06] p-4 text-left shadow-sm",
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary/85">
        {t("summary.eyebrow")}
      </p>
      <p className="mt-1 text-base font-semibold tracking-tight">
        {t("summary.planLine", { plan: planName, interval: intervalLabel })}
      </p>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-1.5 text-sm">
        <span className="text-xl font-semibold tabular-nums">
          {formatVnd(price.perMonth, locale)}
        </span>
        <span className="text-muted-foreground">{t("perMonth")}</span>
      </p>
      {intent.interval === "yearly" ? (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t("billedYearly", {
            amount: formatVnd(price.billedTotal, locale),
            percent: YEARLY_SAVE_PERCENT,
          })}
        </p>
      ) : (
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {t("billedMonthly")}
        </p>
      )}
      {footnote ? (
        <p className="mt-2 text-xs leading-relaxed text-foreground/85">{footnote}</p>
      ) : null}
    </aside>
  );
}
