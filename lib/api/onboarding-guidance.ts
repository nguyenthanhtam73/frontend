import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";
import type { ProductGuidanceItemDTO } from "@/lib/types/product-guidance";
import type { ProductSuggestionDTO } from "@/lib/types/product-suggestion";

export type OnboardingProductGuidanceInput = {
  locale: string;
  skinType: string | null;
  goal: string | null;
  concerns: string[];
};

export type OnboardingProductGuidanceResult = {
  phase: string;
  product_guidance: ProductGuidanceItemDTO[];
  product_suggestions: ProductSuggestionDTO[];
};

/** Catalog matching only, so it answers fast — but never block the UI on it. */
const GUIDANCE_TIMEOUT_MS = 8_000;

/**
 * POST /api/v1/onboarding/product-guidance — product roles + affiliate CTAs built
 * from onboarding answers, for users who never uploaded a photo.
 *
 * Returns null on any failure: the routine steps must still render.
 */
export async function fetchOnboardingProductGuidance(
  input: OnboardingProductGuidanceInput,
  signal?: AbortSignal,
): Promise<OnboardingProductGuidanceResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GUIDANCE_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);

  try {
    const headers: HeadersInit = { "Content-Type": "application/json" };
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(
      `${apiBaseUrl}/api/v1/onboarding/product-guidance`,
      {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          locale: input.locale.toLowerCase().startsWith("en") ? "en" : "vi",
          skin_type: input.skinType ?? "",
          goal: input.goal ?? "",
          concerns: input.concerns,
        }),
      },
    );
    if (!res.ok) return null;

    const json = (await res.json().catch(() => null)) as {
      data?: Partial<OnboardingProductGuidanceResult>;
    } | null;
    const data = json?.data;
    if (!data?.product_guidance?.length) return null;

    return {
      phase: data.phase ?? "",
      product_guidance: data.product_guidance,
      product_suggestions: data.product_suggestions ?? [],
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
