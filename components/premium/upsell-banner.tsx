"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { PremiumUpsellBanner } from "@/components/premium/premium-upsell-banner";
import { reportPaywallView } from "@/lib/analytics/funnel";
import { Feature, type FeatureId } from "@/lib/premium/features";
import { isSePayCheckoutEnabled } from "@/lib/premium/payments-enabled";
import {
  buildUpsellPricingHref,
  recommendedPlanForFeature,
} from "@/lib/premium/upsell-href";
import { useFeatureGate } from "@/lib/premium/use-feature-gate";

type UpsellBannerProps = {
  /** Feature that triggered the upsell — picks copy automatically when set. */
  feature?: FeatureId;
  title?: string;
  body?: string;
  cta?: string;
  ctaHref?: string;
  className?: string;
  compact?: boolean;
  onDismiss?: () => void;
  /** When true, hide the banner if the feature is already unlocked. */
  hideWhenAllowed?: boolean;
  /** Optional id for scroll-into-view from locked CTAs. */
  id?: string;
};

/**
 * Plan upsell surface. Prefer passing `feature` so copy stays consistent
 * with Free / Premium / Premium+ gates.
 *
 * Wraps the existing PremiumUpsellBanner visual — do not duplicate styling.
 * Usage chips only render when GET /me/usage sent a live meter.
 */
export function UpsellBanner({
  feature,
  title,
  body,
  cta,
  ctaHref,
  className,
  compact,
  onDismiss,
  hideWhenAllowed = true,
  id,
}: UpsellBannerProps) {
  const t = useTranslations("premium");
  const gate = useFeatureGate(feature ?? Feature.WardrobeFull);

  if (gate.isLoading) {
    return null;
  }
  if (feature && hideWhenAllowed && !gate.locked) {
    return null;
  }

  const copy = resolveCopy(feature, t, gate.hasMeter ? gate.limit : 0);
  const checkoutEnabled = isSePayCheckoutEnabled();
  const href = ctaHref ?? buildUpsellPricingHref(feature);

  return (
    <div id={id}>
      <PaywallViewTracker feature={feature} />
      <PremiumUpsellBanner
        title={title ?? copy.title}
        body={body ?? (checkoutEnabled ? copy.body : t("betaBody"))}
        cta={cta ?? (checkoutEnabled ? t("cta") : t("betaCta"))}
        ctaHref={href}
        className={className}
        compact={compact}
        onDismiss={onDismiss}
        dismissLabel={t("dismiss")}
        usageLabel={
          gate.hasMeter && !gate.unlimited
            ? t("usageUsed", { used: gate.used, limit: gate.limit })
            : gate.locked && !gate.unlimited
              ? t("usageUnknown")
              : undefined
        }
        remainingLabel={
          gate.hasMeter && !gate.unlimited
            ? t("usageRemaining", { remaining: gate.remaining })
            : undefined
        }
        benefit={checkoutEnabled ? copy.benefit : undefined}
      />
    </div>
  );
}

function resolveCopy(
  feature: FeatureId | undefined,
  t: ReturnType<typeof useTranslations>,
  limit: number,
): { title: string; body: string; benefit: string } {
  switch (feature) {
    case Feature.AIRoutineSuggestion:
      return {
        title: t("quotaSuggestTitle"),
        body: t("quotaSuggestBody"),
        benefit: t("benefitSuggest"),
      };
    case Feature.EditRoutine:
      return {
        title: t("quotaEditTitle"),
        body:
          limit > 0 ? t("quotaEditBody", { limit }) : t("quotaEditBodyUnknown"),
        benefit: t("benefitEdit"),
      };
    case Feature.WardrobeFull:
      return {
        title: t("wardrobeTitle"),
        body: t("wardrobeBody"),
        benefit: t("benefitWardrobe"),
      };
    case Feature.ProgressFullHistory:
      return {
        title: t("progressTitle"),
        body: t("progressBody"),
        benefit: t("benefitProgress"),
      };
    case Feature.AdvancedSkinAnalysis:
      return {
        title: t("advancedTitle"),
        body: t("advancedBody"),
        benefit: t("benefitAdvanced"),
      };
    case Feature.ExportData:
      return {
        title: t("exportTitle"),
        body: t("exportBody"),
        benefit: t("benefitExport"),
      };
    case Feature.MilestoneFull:
      return {
        title: t("milestoneTitle"),
        body: t("milestoneBody"),
        benefit: t("benefitMilestone"),
      };
    default:
      return {
        title: t("genericTitle"),
        body: t("genericBody"),
        benefit: t("benefitGeneric"),
      };
  }
}

function PaywallViewTracker({ feature }: { feature?: FeatureId }) {
  useEffect(() => {
    reportPaywallView(
      {
        surface: "upsell_banner",
        feature,
        recommendedPlan: recommendedPlanForFeature(feature),
      },
      `upsell:${feature ?? "generic"}`,
    );
  }, [feature]);
  return null;
}
