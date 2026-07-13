import type { SkinGoal, SkinTypeCard } from "@/lib/stores/onboarding-store";

/** Infer a reasonable skin type when the user skips photos / AI. */
export function inferSkinTypeFromConcerns(
  concerns: string[],
  goal: SkinGoal | null,
): SkinTypeCard {
  const set = new Set(concerns);

  if (set.has("redness") || set.has("weak_barrier")) return "sensitive";
  if (set.has("dryness") || set.has("dehydration")) return "dry";
  if (set.has("acne") && (set.has("large_pores") || goal === "clear_acne")) return "oily";
  if (set.has("large_pores") && !set.has("dryness")) return "combo";
  if (goal === "barrier") return "sensitive";
  if (goal === "anti_aging") return "normal";

  return "combo";
}
