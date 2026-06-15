import type { SkinProfileResponse } from "@/lib/types/profile";
import type { ProductSuggestionDTO } from "@/lib/types/product-suggestion";
import type { OnboardingSkinAnalyzeDTO } from "@/lib/types/onboarding-ai";
import type { StarterRoutineDTO } from "@/lib/types/starter-routine";

export type OnboardingSnapshot = {
  undertone?: string;
  goal?: string;
  skill_level?: string;
  skin_type?: string;
  body_concerns?: string[];
  completed_via?: string;
  photos_skipped?: boolean;
  photo_urls?: string[];
  starter_routine_pending?: boolean;
  starter_routine?: Record<string, unknown>;
  skin_analysis?: OnboardingSkinAnalyzeDTO | Record<string, unknown>;
};

export function parseOnboardingSnapshot(
  raw: SkinProfileResponse["onboarding_snapshot"],
): OnboardingSnapshot | null {
  if (raw == null) return null;
  try {
    const snap = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!snap || typeof snap !== "object") return null;
    return snap as OnboardingSnapshot;
  } catch {
    return null;
  }
}

export function parseSnapshotStarter(
  raw: SkinProfileResponse["onboarding_snapshot"],
): StarterRoutineDTO | null {
  const snap = parseOnboardingSnapshot(raw);
  const sr = snap?.starter_routine;
  if (!sr || typeof sr !== "object") return null;
  return {
    morning: Array.isArray(sr.morning) ? (sr.morning as string[]) : [],
    evening: Array.isArray(sr.evening) ? (sr.evening as string[]) : [],
    week_notes: String(sr.week_notes ?? ""),
    safety_notes: String(sr.safety_notes ?? ""),
    encouragement: String(sr.encouragement ?? ""),
    skin_readback: String(sr.skin_readback ?? ""),
    rationale: String(sr.rationale ?? ""),
    closing_reminder: String(sr.closing_reminder ?? ""),
    product_suggestions: Array.isArray(sr.product_suggestions)
      ? (sr.product_suggestions as ProductSuggestionDTO[])
      : undefined,
  };
}

/** True when persisted onboarding snapshot still awaits AI starter refresh. */
export function isStarterRoutinePending(
  raw: SkinProfileResponse["onboarding_snapshot"],
): boolean {
  const snap = parseOnboardingSnapshot(raw);
  return snap?.starter_routine_pending === true;
}

/** True when the user has a persisted or preview onboarding result. */
export function isOnboardingComplete(profile: SkinProfileResponse | null | undefined): boolean {
  if (!profile?.id) return false;
  const snap = parseOnboardingSnapshot(profile.onboarding_snapshot);
  if (snap?.starter_routine) return true;
  if (snap?.completed_via === "onboarding_v1") return true;
  return Boolean(profile.skin_type?.trim());
}

export function getOnboardingCompletedAt(profile: SkinProfileResponse): string {
  return profile.updated_at || profile.created_at;
}

/** Rich photo-coach notes from persisted vision analysis (preferred over starter skin_readback). */
export function parseSnapshotCoachingNotes(
  raw: SkinProfileResponse["onboarding_snapshot"],
): string | undefined {
  const snap = parseOnboardingSnapshot(raw);
  const analysis = snap?.skin_analysis;
  if (!analysis || typeof analysis !== "object") return undefined;
  const notes = (analysis as OnboardingSkinAnalyzeDTO).coaching_notes;
  const trimmed = typeof notes === "string" ? notes.trim() : "";
  return trimmed || undefined;
}
