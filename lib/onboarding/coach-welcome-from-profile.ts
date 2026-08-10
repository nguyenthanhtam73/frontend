import { ONBOARDING_MAX_PHOTOS } from "@/lib/onboarding/constants";
import { normalizeReviewPhotoUrls } from "@/lib/onboarding/photo-session-urls";
import {
  isStarterRoutinePending,
  parseOnboardingSnapshot,
  parseSnapshotCoachingNotes,
  parseSnapshotStarter,
} from "@/lib/onboarding/snapshot";
import type { OnboardingSkinAnalyzeDTO } from "@/lib/types/onboarding-ai";
import type { SkinProfileResponse } from "@/lib/types/profile";
import type { StarterRoutineDTO } from "@/lib/types/starter-routine";

export type CoachWelcomeAnalysisHints = {
  phase?: string | null;
  severity?: string | null;
  regions?: string[];
  concerns?: string[];
};

export type CoachWelcomeFromProfile = {
  profileId: string;
  starter: StarterRoutineDTO;
  pending: boolean;
  completedAt: string;
  coachingNotes?: string;
  photoUrls: string[];
  analysisPhase?: string | null;
  analysisHints: CoachWelcomeAnalysisHints;
};

function analysisHintsFromSnap(
  analysis: OnboardingSkinAnalyzeDTO | Record<string, unknown> | null | undefined,
  bodyConcerns?: string[],
): CoachWelcomeAnalysisHints {
  if (!analysis || typeof analysis !== "object") {
    return {
      phase: null,
      severity: null,
      regions: undefined,
      concerns: bodyConcerns?.length ? bodyConcerns : undefined,
    };
  }
  const a = analysis as OnboardingSkinAnalyzeDTO;
  const concerns =
    (a.main_concerns?.length ? a.main_concerns : undefined) ||
    (a.concern_types?.length ? a.concern_types : undefined) ||
    (a.concerns?.length ? a.concerns : undefined) ||
    (bodyConcerns?.length ? bodyConcerns : undefined);
  return {
    phase: a.phase?.trim() || null,
    severity: a.severity_level?.trim() || null,
    regions: a.primary_regions?.length ? a.primary_regions : undefined,
    concerns,
  };
}

/** Build coach-welcome payload from persisted skin profile (cold load). */
export function buildCoachWelcomeFromProfile(
  profile: SkinProfileResponse,
): CoachWelcomeFromProfile | null {
  const starter = parseSnapshotStarter(profile.onboarding_snapshot);
  if (!starter) return null;

  const snap = parseOnboardingSnapshot(profile.onboarding_snapshot);
  const analysis =
    snap?.skin_analysis && typeof snap.skin_analysis === "object"
      ? (snap.skin_analysis as OnboardingSkinAnalyzeDTO)
      : null;

  const photoUrls = normalizeReviewPhotoUrls(
    (profile.photo_urls?.length
      ? profile.photo_urls
      : snap?.photo_urls ?? []
    ).slice(0, ONBOARDING_MAX_PHOTOS),
  );

  const coachingNotes =
    parseSnapshotCoachingNotes(profile.onboarding_snapshot) ||
    analysis?.coaching_notes?.trim() ||
    starter.skin_readback?.trim() ||
    undefined;

  const analysisHints = analysisHintsFromSnap(
    analysis,
    snap?.body_concerns ?? profile.concerns,
  );

  return {
    profileId: profile.id,
    starter,
    pending: isStarterRoutinePending(profile.onboarding_snapshot),
    completedAt: profile.updated_at || profile.created_at,
    coachingNotes: coachingNotes || undefined,
    photoUrls,
    analysisPhase: analysisHints.phase,
    analysisHints,
  };
}
