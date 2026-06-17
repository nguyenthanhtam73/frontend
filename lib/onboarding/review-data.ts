import type { OnboardingState } from "@/lib/stores/onboarding-store";
import type { OnboardingReviewSummary } from "@/lib/types/starter-routine";
import type { SkinProfileResponse } from "@/lib/types/profile";
import { bodyConcernsFromStore } from "@/lib/onboarding/finish-body";
import {
  getOnboardingCompletedAt,
  isStarterRoutinePending,
  parseOnboardingSnapshot,
  parseSnapshotCoachingNotes,
  parseSnapshotStarter,
} from "@/lib/onboarding/snapshot";
import {
  COACH_WELCOME_STORAGE_KEY,
  GUEST_COACH_PROFILE_ID,
  type CoachWelcomePayload,
  type StarterRoutineDTO,
} from "@/lib/types/starter-routine";
import {
  clearJustCompletedOnboarding,
  hasGuestCompletedOnboardingTrial,
} from "@/lib/stores/onboarding-store";
import { ONBOARDING_MAX_PHOTOS } from "@/lib/onboarding/constants";
import { normalizeReviewPhotoUrls } from "@/lib/onboarding/photo-session-urls";

export type OnboardingReviewData = {
  profileId: string | null;
  isGuest: boolean;
  completedAt: string;
  skinType: string | null;
  undertone: string | null;
  goal: string | null;
  skillLevel: string | null;
  concerns: string[];
  photoUrls: string[];
  photosSkipped: boolean;
  starter: StarterRoutineDTO | null;
  coachingNotes?: string;
  starterRoutinePending?: boolean;
};

export function buildReviewSummaryFromStore(ob: OnboardingState): OnboardingReviewSummary {
  const concerns = bodyConcernsFromStore(ob);
  return {
    skin_type: ob.skinType ?? undefined,
    undertone: ob.undertone ?? undefined,
    goal: ob.goal ?? undefined,
    skill_level: ob.skillMode ?? undefined,
    body_concerns: concerns.length ? concerns : undefined,
    completed_at: new Date().toISOString(),
    skin_analysis: ob.aiSnapshot ?? undefined,
  };
}

export function buildReviewFromProfile(profile: SkinProfileResponse): OnboardingReviewData {
  const snap = parseOnboardingSnapshot(profile.onboarding_snapshot);
  const concerns = snap?.body_concerns?.length
    ? snap.body_concerns
    : profile.concerns ?? [];
  const photoUrls = normalizeReviewPhotoUrls(
    (profile.photo_urls?.length ? profile.photo_urls : snap?.photo_urls ?? []).slice(
      0,
      ONBOARDING_MAX_PHOTOS,
    ),
  );
  return {
    profileId: profile.id,
    isGuest: false,
    completedAt: getOnboardingCompletedAt(profile),
    skinType: profile.skin_type ?? snap?.skin_type ?? null,
    undertone: snap?.undertone ?? null,
    goal: snap?.goal ?? null,
    skillLevel: profile.skill_level ?? snap?.skill_level ?? null,
    concerns,
    photoUrls,
    photosSkipped: snap?.photos_skipped === true,
    starter: parseSnapshotStarter(profile.onboarding_snapshot),
    coachingNotes: parseSnapshotCoachingNotes(profile.onboarding_snapshot),
    starterRoutinePending: isStarterRoutinePending(profile.onboarding_snapshot),
  };
}

export function loadGuestReviewFromSession(): OnboardingReviewData | null {
  if (typeof window === "undefined") return null;
  if (!hasGuestCompletedOnboardingTrial()) return null;
  try {
    const raw = sessionStorage.getItem(COACH_WELCOME_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as CoachWelcomePayload;
    if (!p.starterRoutine) return null;
    const summary = p.reviewSummary;
    return {
      profileId: p.profileId ?? GUEST_COACH_PROFILE_ID,
      isGuest: true,
      completedAt: summary?.completed_at ?? new Date().toISOString(),
      skinType: summary?.skin_type ?? null,
      undertone: summary?.undertone ?? null,
      goal: summary?.goal ?? null,
      skillLevel: summary?.skill_level ?? null,
      concerns: summary?.body_concerns ?? [],
      photoUrls: normalizeReviewPhotoUrls(
        (summary?.photo_urls ?? []).slice(0, ONBOARDING_MAX_PHOTOS),
      ),
      photosSkipped: summary?.photos_skipped === true,
      starter: p.starterRoutine,
      coachingNotes:
        p.coachingNotes?.trim() ||
        summary?.skin_analysis?.coaching_notes?.trim() ||
        undefined,
      starterRoutinePending: p.starterRoutinePending === true,
    };
  } catch {
    return null;
  }
}

export function clearOnboardingSessionCache(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(COACH_WELCOME_STORAGE_KEY);
    sessionStorage.removeItem("dadiary_onboarding_exit_anim");
    clearJustCompletedOnboarding();
  } catch {
    /* ignore */
  }
}
