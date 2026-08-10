import { buildPersonalizedStepWhy } from "@/lib/onboarding/personalize-step-tip";
import {
  formatShortCatalogLabel,
  pickCatalogSoftLabels,
} from "@/lib/onboarding/pick-catalog-soft-label";
import type { RoutineStepIconKind } from "@/lib/onboarding/parse-routine-step";
import { parseRoutineStep } from "@/lib/onboarding/parse-routine-step";
import type { ProductGuidanceItemDTO } from "@/lib/types/product-guidance";

export type RoutineStepProductTip = {
  guidanceStep: string;
  /** Affiliate / soft product title (short). */
  label: string;
  /** Soft (non-CTA) suggestions — render as 1–2 short lines. */
  softLabels?: string[];
  /** One short why line (affiliate tips only). */
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

export type AttachGuidanceCtx = {
  locale: string;
  phase?: string;
  severity?: string;
  regions?: string[];
  concerns?: string[];
  skinType?: string;
};

/** Lower = higher CTA priority (cleanser + SPF beat moisturizer). */
const CTA_ROLE_PRIORITY: Record<string, number> = {
  cleanse: 0,
  spf: 1,
  moisturize: 2,
  soothe: 3,
  treat: 4,
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
  if (calm) {
    if (stepCount >= 2) {
      return (["cleanse", "moisturize"] as const)[index] ?? null;
    }
    return index === 0 ? "cleanse" : null;
  }
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
  if (role === "soothe") return byStep.get("moisturize");
  return undefined;
}

type StepRef = {
  key: string;
  period: "morning" | "evening";
  index: number;
  role: string;
  g?: ProductGuidanceItemDTO;
};

/**
 * Map product_guidance onto AM/PM routine lines.
 * ≤2 Shopee CTAs (prefer cleanse + SPF). Soft tips only for roles not already covered.
 */
export function attachGuidanceToRoutineSteps(
  morning: string[],
  evening: string[],
  guidance: ProductGuidanceItemDTO[] | undefined,
  carePhase: string = "calm_first",
  tipCtx: AttachGuidanceCtx = { locale: "vi" },
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

  const phase = tipCtx.phase || carePhase;

  const collect = (
    period: "morning" | "evening",
    steps: string[],
  ): StepRef[] =>
    steps.map((text, index) => {
      const parsed = parseRoutineStep(text);
      const fromIcon = iconToGuidanceStep(parsed.icon);
      const fromPos = positionalGuidanceStep(
        period,
        index,
        steps.length,
        carePhase,
      );
      const role = (fromIcon ?? fromPos) || "";
      return {
        key: `${period}:${index}`,
        period,
        index,
        role,
        g: role ? pickGuidance(byStep, role) : undefined,
      };
    });

  const morningRefs = collect("morning", morning);
  const eveningRefs = collect("evening", evening);
  const allRefs = [...morningRefs, ...eveningRefs];

  const ctaKeys = new Set<string>();
  const usedProductIds = new Set<string>();
  const candidates = allRefs
    .map((ref) => {
      const link = ref.g?.affiliate_link?.trim();
      const id = ref.g?.affiliate_product_id?.trim();
      if (!link || !id) return null;
      return { ref, link, id };
    })
    .filter(Boolean) as { ref: StepRef; link: string; id: string }[];

  candidates.sort((a, b) => {
    const pa = CTA_ROLE_PRIORITY[a.ref.role] ?? 9;
    const pb = CTA_ROLE_PRIORITY[b.ref.role] ?? 9;
    if (pa !== pb) return pa - pb;
    if (a.ref.period !== b.ref.period) {
      return a.ref.period === "morning" ? -1 : 1;
    }
    return a.ref.index - b.ref.index;
  });

  for (const c of candidates) {
    if (ctaKeys.size >= 2) break;
    if (usedProductIds.has(c.id)) continue;
    ctaKeys.add(c.ref.key);
    usedProductIds.add(c.id);
  }

  const rolesCovered = new Set<string>();
  for (const c of candidates) {
    if (ctaKeys.has(c.ref.key)) rolesCovered.add(c.ref.role);
  }

  const toTip = (ref: StepRef): RoutineStepProductTip | null => {
    if (!ref.role) return null;
    const g = ref.g;
    const guidanceStep = ref.role;
    const link = g?.affiliate_link?.trim();
    const productId = g?.affiliate_product_id?.trim();
    const canAff =
      ctaKeys.has(ref.key) && Boolean(link && productId) && productId !== undefined;

    if (canAff && link && productId) {
      const productLabel = formatShortCatalogLabel({
        brand: g?.brand,
        product_name: g?.product_name || g?.name_or_category,
      });
      const why = buildPersonalizedStepWhy(guidanceStep, {
        locale: tipCtx.locale,
        phase,
        severity: tipCtx.severity,
        regions: tipCtx.regions,
        concerns: tipCtx.concerns,
        productLabel,
      });
      rolesCovered.add(guidanceStep);
      return {
        guidanceStep,
        label: productLabel,
        why,
        affiliate: {
          product_id: productId,
          product_name: g?.product_name || g?.name_or_category || productLabel,
          brand: g?.brand || "",
          affiliate_link: link,
          price_range: g?.price_range || "",
          why,
        },
      };
    }

    // Skip soft tip when this role already has a CTA or soft tip (less mobile clutter).
    if (rolesCovered.has(guidanceStep)) return null;

    const softLabels = pickCatalogSoftLabels(guidanceStep, {
      locale: tipCtx.locale,
      phase,
      concerns: tipCtx.concerns,
      skinType: tipCtx.skinType,
      excludeIds: usedProductIds,
      prefer: {
        id: productId,
        brand: g?.brand,
        product_name: g?.product_name,
      },
    });
    if (!softLabels.length) return null;
    rolesCovered.add(guidanceStep);
    return {
      guidanceStep,
      label: softLabels[0],
      softLabels,
      why: "",
    };
  };

  return {
    morning: morningRefs.map(toTip),
    evening: eveningRefs.map(toTip),
  };
}

export function countRoutineAffiliateCtas(tips: {
  morning: (RoutineStepProductTip | null)[];
  evening: (RoutineStepProductTip | null)[];
}): number {
  return [...tips.morning, ...tips.evening].filter((t) => t?.affiliate).length;
}
