"use client";

import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";

import { OnboardingRoutinePeriodSection } from "@/components/onboarding/onboarding-starter-routine-step";
import {
  attachGuidanceToRoutineSteps,
  countRoutineAffiliateCtas,
  type RoutineStepProductTip,
} from "@/lib/onboarding/attach-guidance-to-routine";
import { enrichProductGuidanceItems } from "@/lib/onboarding/enrich-product-guidance";
import {
  filterGuidanceForPhase,
  resolveCarePhaseFromAnalysis,
  starterCareNote,
  type StarterCarePhase,
} from "@/lib/onboarding/guest-starter";
import type { ProductGuidanceItemDTO } from "@/lib/types/product-guidance";
import type { StarterRoutineDTO } from "@/lib/types/starter-routine";
import { cn } from "@/lib/utils";

/** Infer care phase without treating calm “chưa trị mụn mạnh” as active phase. */
export function inferCarePhaseFromStarter(
  starter: StarterRoutineDTO,
  analysisPhase?: string | null,
): StarterCarePhase {
  if (analysisPhase) {
    return resolveCarePhaseFromAnalysis({ phase: analysisPhase });
  }
  const evening = starter.evening.join(" ").toLowerCase();
  const calmBlob = [evening, starter.safety_notes, starter.week_notes]
    .join(" ")
    .toLowerCase();
  // Calm-first copy frequently says “chưa trị mụn mạnh” / “ưu tiên làm dịu”.
  if (
    /chưa\s*(dùng\s*)?(sản phẩm\s*)?(trị|acid|retinol|bha|aha)/.test(calmBlob) ||
    /ưu tiên làm dịu|làm dịu trước|calm first|skip strong/.test(calmBlob)
  ) {
    return "calm_first";
  }
  // Only evening treat language (not safety/week negation) unlocks active phase.
  if (/\b(bha|aha|retinol|retinoid|benzoyl)\b/.test(evening)) {
    return "can_add_active";
  }
  if (
    /một sản phẩm trị|one mild treatment|optional active|có thể thêm/.test(evening)
  ) {
    return "can_add_active";
  }
  return "calm_first";
}

type StarterRoutineCardsProps = {
  starter: StarterRoutineDTO;
  morningLabel?: string;
  eveningLabel?: string;
  noStepsLabel: string;
  /** Hero layout for coach-welcome — section heading. */
  featured?: boolean;
  sectionTitle?: string;
  sectionSubtitle?: string;
  /** Vision phase when known (preferred over heuristic). */
  carePhaseHint?: string | null;
  concerns?: string[];
  severity?: string;
  regions?: string[];
  skinType?: string;
  /** Onboarding Step 2 only — muted Shopee catalog hint. */
  showCommerceEmptyHint?: boolean;
  /** Shorter product tips (coach-welcome / review). Default true. */
  compactTips?: boolean;
  className?: string;
};

/**
 * AM/PM routine with product tips folded into each step (same pattern as
 * onboarding Step 2) — no separate “Hướng sản phẩm” wall of cards.
 */
export function StarterRoutineCards({
  starter,
  noStepsLabel,
  featured = false,
  sectionTitle,
  sectionSubtitle,
  carePhaseHint,
  concerns,
  severity,
  regions,
  skinType,
  showCommerceEmptyHint = false,
  compactTips = true,
  className,
}: StarterRoutineCardsProps) {
  const tOnb = useTranslations("onboarding");
  const locale = useLocale();
  const carePhase = useMemo(
    () => inferCarePhaseFromStarter(starter, carePhaseHint),
    [starter, carePhaseHint],
  );

  const guidanceItems = useMemo(
    () =>
      filterGuidanceForPhase(starter.product_guidance, carePhase) as
        | ProductGuidanceItemDTO[]
        | undefined,
    [starter.product_guidance, carePhase],
  );

  const enrichedGuidance = useMemo(
    () =>
      enrichProductGuidanceItems(guidanceItems, {
        locale,
        phase: carePhase === "manual" ? "calm_first" : carePhase,
        severity,
        regions,
        concerns,
      }),
    [guidanceItems, locale, carePhase, severity, regions, concerns],
  );

  const stepTips = useMemo(() => {
    if (!starter.morning.length && !starter.evening.length) {
      return {
        morning: [] as (RoutineStepProductTip | null)[],
        evening: [] as (RoutineStepProductTip | null)[],
      };
    }
    return attachGuidanceToRoutineSteps(
      starter.morning,
      starter.evening,
      enrichedGuidance,
      carePhase === "manual" ? "calm_first" : carePhase,
      {
        locale,
        phase: carePhase === "manual" ? "calm_first" : carePhase,
        severity,
        regions,
        concerns,
        skinType,
      },
    );
  }, [
    starter.morning,
    starter.evening,
    enrichedGuidance,
    carePhase,
    locale,
    severity,
    regions,
    concerns,
    skinType,
  ]);

  const affiliateCtaCount = useMemo(
    () => countRoutineAffiliateCtas(stepTips),
    [stepTips],
  );

  const sharedCareNote = useMemo(() => {
    if (!compactTips || !featured) return null;
    return starterCareNote(null, locale, carePhase, {
      guidanceHasNoPickCaution: false,
    });
  }, [compactTips, featured, locale, carePhase]);

  const emptyMorning =
    starter.morning.length === 0 ? (
      <p className="px-3 py-2 text-sm text-muted-foreground">{noStepsLabel}</p>
    ) : null;
  const emptyEvening =
    starter.evening.length === 0 ? (
      <p className="px-3 py-2 text-sm text-muted-foreground">{noStepsLabel}</p>
    ) : null;

  const body = (
    <div
      className={cn("space-y-2.5", className)}
      data-testid="coach-welcome-starter-cards"
    >
      {starter.morning.length > 0 ? (
        <OnboardingRoutinePeriodSection
          period="morning"
          steps={starter.morning}
          editing={false}
          carePhase={carePhase}
          productTips={stepTips.morning}
          sectionTestId="coach-welcome-morning"
          stepTestIdPrefix="coach-welcome-morning"
          compactTips={compactTips}
          emptyCommerceHint={
            showCommerceEmptyHint && affiliateCtaCount === 0
              ? tOnb("step2.commerceEmptyHint")
              : null
          }
        />
      ) : (
        <div data-testid="coach-welcome-morning">{emptyMorning}</div>
      )}
      {starter.evening.length > 0 ? (
        <OnboardingRoutinePeriodSection
          period="evening"
          steps={starter.evening}
          editing={false}
          carePhase={carePhase}
          productTips={stepTips.evening}
          sectionTestId="coach-welcome-evening"
          stepTestIdPrefix="coach-welcome-evening"
          compactTips={compactTips}
          morningProductTips={stepTips.morning}
        />
      ) : (
        <div data-testid="coach-welcome-evening">{emptyEvening}</div>
      )}
    </div>
  );

  if (!featured && !sectionTitle) return body;

  return (
    <div className="space-y-3" data-testid="coach-welcome-starter">
      {sectionTitle ? (
        <div className="space-y-0.5">
          <h2 className="text-base font-bold tracking-tight sm:text-lg">
            {sectionTitle}
          </h2>
          {sectionSubtitle ? (
            <p className="text-xs text-muted-foreground sm:text-sm">
              {sectionSubtitle}
            </p>
          ) : null}
        </div>
      ) : null}
      {sharedCareNote ? (
        <p
          className="rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] px-3 py-2 text-xs leading-relaxed text-foreground/90"
          data-testid="coach-welcome-shared-care-note"
        >
          {sharedCareNote}
        </p>
      ) : null}
      {body}
    </div>
  );
}

/**
 * Folded AM/PM tips cover product picks — only fall back to legacy suggestion
 * cards when there is no routine to attach tips to.
 */
export function starterHasFoldableGuidance(starter: StarterRoutineDTO): boolean {
  return starter.morning.length > 0 || starter.evening.length > 0;
}
