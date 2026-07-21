"use client";

import { useTranslations } from "next-intl";

import { PremiumUpsellBanner } from "@/components/premium/premium-upsell-banner";
import { Feature, type FeatureId } from "@/lib/premium/features";
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
 */
export function UpsellBanner({
  feature,
  title,
  body,
  cta,
  ctaHref = "/pricing",
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

  const copy = resolveCopy(feature, t, gate.limit || (feature === Feature.EditRoutine ? 5 : 3));

  return (
    <div id={id}>
      <PremiumUpsellBanner
        title={title ?? copy.title}
        body={body ?? copy.body}
        cta={cta ?? t("cta")}
        ctaHref={ctaHref}
        className={className}
        compact={compact}
        onDismiss={onDismiss}
        dismissLabel={t("dismiss")}
      />
    </div>
  );
}

function resolveCopy(
  feature: FeatureId | undefined,
  t: ReturnType<typeof useTranslations>,
  limit: number,
): { title: string; body: string } {
  switch (feature) {
    case Feature.AIRoutineSuggestion:
      return {
        title: t("quotaSuggestTitle"),
        body: t("quotaSuggestBody"),
      };
    case Feature.EditRoutine:
      return {
        title: t("quotaEditTitle"),
        body: t("quotaEditBody", { limit: limit || 5 }),
      };
    case Feature.WardrobeFull:
      return {
        title: t("wardrobeTitle"),
        body: t("wardrobeBody"),
      };
    case Feature.ProgressFullHistory:
      return {
        title: t("progressTitle"),
        body: t("progressBody"),
      };
    case Feature.AdvancedSkinAnalysis:
      return {
        title: t("advancedTitle"),
        body: t("advancedBody"),
      };
    case Feature.ExportData:
      return {
        title: t("exportTitle"),
        body: t("exportBody"),
      };
    case Feature.MilestoneFull:
      return {
        title: t("milestoneTitle"),
        body: t("milestoneBody"),
      };
    default:
      return {
        title: t("genericTitle"),
        body: t("genericBody"),
      };
  }
}
