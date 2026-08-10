import {
  buildPersonalizedStepBenefit,
  buildPersonalizedStepWhy,
} from "@/lib/onboarding/personalize-step-tip";
import type { RoutineStepIconKind } from "@/lib/onboarding/parse-routine-step";
import { parseRoutineStep } from "@/lib/onboarding/parse-routine-step";
import type { ProductGuidanceItemDTO } from "@/lib/types/product-guidance";

export type RoutineStepProductTip = {
  guidanceStep: string;
  /** Role or product label shown above why. */
  label: string;
  /** Why this fits the user’s skin. */
  why: string;
  /** One short “helps you” line. */
  benefit: string;
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

function fallbackRoleLabel(step: string, locale: string): string {
  const en = locale.toLowerCase().startsWith("en");
  switch (step) {
    case "cleanse":
      return en ? "Gentle cleanser" : "Sữa rửa mặt dịu";
    case "moisturize":
      return en ? "Soothing moisturizer" : "Kem dưỡng làm dịu";
    case "spf":
      return en ? "Gentle morning sunscreen" : "Kem chống nắng dịu buổi sáng";
    case "treat":
      return en ? "One treatment (optional)" : "1 sản phẩm trị (tuỳ chọn)";
    case "soothe":
      return en ? "Soothing layer" : "Lớp làm dịu";
    default:
      return en ? "Product tip" : "Gợi ý sản phẩm";
  }
}

/** Soft product example when catalog has no affiliate CTA for this role. */
function exampleProductLabel(step: string, locale: string): string {
  const en = locale.toLowerCase().startsWith("en");
  switch (step) {
    case "cleanse":
      return en
        ? "CeraVe · Foaming Facial Cleanser (or similar gentle wash)"
        : "CeraVe · Sữa rửa mặt tạo bọt (hoặc loại dịu tương tự)";
    case "moisturize":
    case "soothe":
      return en
        ? "La Roche-Posay · Cicaplast Baume B5+ (or similar repair cream)"
        : "La Roche-Posay · Kem phục hồi Cicaplast Baume B5+ (hoặc kem phục hồi tương tự)";
    case "spf":
      return en
        ? "La Roche-Posay · Anthelios (or a gentle face sunscreen)"
        : "La Roche-Posay · Anthelios (hoặc kem chống nắng mặt dịu tương tự)";
    case "treat":
      return en
        ? "One mild BHA (optional — only when skin is calm)"
        : "1 BHA nhẹ (tuỳ chọn — chỉ khi da đã êm)";
    default:
      return fallbackRoleLabel(step, locale);
  }
}

/**
 * Map enriched product_guidance onto AM/PM routine lines.
 * Always attaches a skin-personal tip (label + why + benefit); affiliate CTAs ≤2.
 */
export function attachGuidanceToRoutineSteps(
  morning: string[],
  evening: string[],
  guidance: ProductGuidanceItemDTO[] | undefined,
  hideCommerce: boolean,
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

  let affiliateSlots = 0;
  const usedProductIds = new Set<string>();
  const phase = tipCtx.phase || carePhase;

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
      const guidanceStep = String(g?.step || role).toLowerCase();

      const link = g?.affiliate_link?.trim();
      const productId = g?.affiliate_product_id?.trim();
      const canAff =
        !hideCommerce &&
        Boolean(link && productId) &&
        affiliateSlots < 2 &&
        productId !== undefined &&
        !usedProductIds.has(productId);

      const productLabel = canAff
        ? [g?.brand, g?.product_name].filter(Boolean).join(" · ")
        : g?.name_or_category?.trim() ||
          exampleProductLabel(guidanceStep, tipCtx.locale);

      const personalCtx = {
        locale: tipCtx.locale,
        phase,
        severity: tipCtx.severity,
        regions: tipCtx.regions,
        concerns: tipCtx.concerns,
        // Always name the product in why — affiliate or soft example.
        productLabel,
      };

      const tip: RoutineStepProductTip = {
        guidanceStep,
        label: productLabel,
        why: buildPersonalizedStepWhy(guidanceStep, personalCtx),
        benefit: buildPersonalizedStepBenefit(guidanceStep, personalCtx),
      };

      if (canAff && link && productId) {
        affiliateSlots += 1;
        usedProductIds.add(productId);
        tip.affiliate = {
          product_id: productId,
          product_name: g?.product_name || g?.name_or_category || productLabel,
          brand: g?.brand || "",
          affiliate_link: link,
          price_range: g?.price_range || "",
          why: tip.why,
        };
        tip.label = productLabel;
      }

      return tip;
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
