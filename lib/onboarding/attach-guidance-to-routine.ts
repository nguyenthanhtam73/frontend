import type { RoutineStepIconKind } from "@/lib/onboarding/parse-routine-step";
import { parseRoutineStep } from "@/lib/onboarding/parse-routine-step";
import type { ProductGuidanceItemDTO } from "@/lib/types/product-guidance";

export type RoutineStepProductTip = {
  guidanceStep: string;
  /** One short plain-language why line (optional). */
  why: string;
  affiliate?: {
    product_id: string;
    product_name: string;
    brand: string;
    affiliate_link: string;
    price_range: string;
    why: string;
  };
};

function iconToGuidanceStep(icon: RoutineStepIconKind): string | null {
  switch (icon) {
    case "cleanser":
      return "cleanse";
    case "moisturizer":
    case "repair":
      return "moisturize";
    case "spf":
      return "spf";
    case "treatment":
      return "treat";
    case "serum":
      return "soothe";
    default:
      return null;
  }
}

/** Scaffold fallback when icon inference fails (user edited weird titles). */
function positionalGuidanceStep(
  period: "morning" | "evening",
  index: number,
  stepCount: number,
  carePhase: string,
): string | null {
  const calm =
    carePhase === "calm_first" ||
    carePhase === "manual" ||
    carePhase === "";
  if (period === "morning") {
    if (stepCount >= 3) {
      return (["cleanse", "moisturize", "spf"] as const)[index] ?? null;
    }
    if (stepCount === 2) {
      return (["cleanse", "spf"] as const)[index] ?? null;
    }
    return index === 0 ? "cleanse" : null;
  }
  // evening
  if (calm) {
    if (stepCount >= 2) {
      return (["cleanse", "moisturize"] as const)[index] ?? null;
    }
    return index === 0 ? "cleanse" : null;
  }
  // can_add_active evening: cleanse → optional treat → moisturize
  if (stepCount >= 3) {
    return (["cleanse", "treat", "moisturize"] as const)[index] ?? null;
  }
  if (stepCount === 2) {
    return (["cleanse", "moisturize"] as const)[index] ?? null;
  }
  return index === 0 ? "cleanse" : null;
}

function pickGuidance(
  byStep: Map<string, ProductGuidanceItemDTO>,
  role: string,
): ProductGuidanceItemDTO | undefined {
  const direct = byStep.get(role);
  if (direct) return direct;
  // Soothe was folded into moisturize for calm_first — fall back.
  if (role === "soothe") return byStep.get("moisturize");
  return undefined;
}

/**
 * Map enriched product_guidance onto AM/PM routine lines.
 * Prefer icon inference; fall back to scaffold position when edit broke titles.
 * Affiliate CTAs capped at 2 (morning preferred).
 */
export function attachGuidanceToRoutineSteps(
  morning: string[],
  evening: string[],
  guidance: ProductGuidanceItemDTO[] | undefined,
  hideCommerce: boolean,
  carePhase: string = "calm_first",
): {
  morning: (RoutineStepProductTip | null)[];
  evening: (RoutineStepProductTip | null)[];
} {
  const byStep = new Map<string, ProductGuidanceItemDTO>();
  for (const g of guidance ?? []) {
    const step = String(g.step ?? "").toLowerCase();
    if (!step || byStep.has(step)) continue;
    byStep.set(step, g);
  }

  let affiliateSlots = 0;
  const usedProductIds = new Set<string>();

  const mapPeriod = (
    period: "morning" | "evening",
    steps: string[],
  ): (RoutineStepProductTip | null)[] =>
    steps.map((text, index) => {
      const parsed = parseRoutineStep(text);
      const fromIcon = iconToGuidanceStep(parsed.icon);
      const fromPos = positionalGuidanceStep(
        period,
        index,
        steps.length,
        carePhase,
      );
      const role = fromIcon ?? fromPos;
      if (!role) return null;
      const g = pickGuidance(byStep, role);
      if (!g) return null;

      const why = g.why?.trim() || "";
      const tip: RoutineStepProductTip = {
        guidanceStep: String(g.step || role).toLowerCase(),
        why,
      };

      const link = g.affiliate_link?.trim();
      const productId = g.affiliate_product_id?.trim();
      if (
        !hideCommerce &&
        link &&
        productId &&
        affiliateSlots < 2 &&
        !usedProductIds.has(productId)
      ) {
        affiliateSlots += 1;
        usedProductIds.add(productId);
        tip.affiliate = {
          product_id: productId,
          product_name: g.product_name || g.name_or_category,
          brand: g.brand || "",
          affiliate_link: link,
          price_range: g.price_range || "",
          why: g.why || "",
        };
      }

      return tip.why || tip.affiliate ? tip : null;
    });

  return {
    morning: mapPeriod("morning", morning),
    evening: mapPeriod("evening", evening),
  };
}

export function countRoutineAffiliateCtas(tips: {
  morning: (RoutineStepProductTip | null)[];
  evening: (RoutineStepProductTip | null)[];
}): number {
  return [...tips.morning, ...tips.evening].filter((t) => t?.affiliate).length;
}
