import { ONBOARDING_DEFAULT_BUDGET, ONBOARDING_MAX_PHOTOS } from "@/lib/onboarding/constants";
import type { OnboardingFinishBody } from "@/lib/onboarding/finish-body";
import {
  postOnboardingComplete,
  postOnboardingPhotos,
} from "@/lib/onboarding/finish-request";
import {
  patchCoachWelcomeSession,
  readCoachWelcomeSession,
} from "@/lib/onboarding/coach-welcome-session";
import {
  clearGuestClaimPhotos,
  loadGuestClaimPhotos,
  revokeGuestPhotoPreviews,
} from "@/lib/onboarding/guest-photo-idb";
import { normalizeReviewPhotoUrls } from "@/lib/onboarding/photo-session-urls";
import type { OnboardingSkinAnalyzeDTO } from "@/lib/types/onboarding-ai";
import {
  GUEST_COACH_PROFILE_ID,
  type CoachWelcomePayload,
} from "@/lib/types/starter-routine";
import type { PhotoItem } from "@/lib/stores/onboarding-store";
import { useAuthStore } from "@/lib/stores/auth-store";

/** After guest claim, land on the payoff screen with their routine. */
export const GUEST_CLAIM_RETURN_PATH = "/onboarding/coach-welcome";

/** True when payload still looks like a local guest trial (not a prior account). */
export function sessionLooksLikeGuestTrial(
  session: CoachWelcomePayload | null,
): boolean {
  if (!session) return false;
  // Require an explicit guest marker — missing profileId alone is too loose
  // (malformed leftover sessions must not claim onto a new account).
  return (
    session.guestPreview === true ||
    session.profileId === GUEST_COACH_PROFILE_ID
  );
}

function resolveSkinType(session: CoachWelcomePayload): string | null {
  const summary = session.reviewSummary;
  const v =
    summary?.skin_type?.trim() ||
    summary?.skin_analysis?.skin_type_guess?.trim() ||
    "";
  return v || null;
}

function resolveGoal(session: CoachWelcomePayload): string | null {
  const summary = session.reviewSummary;
  const v =
    summary?.goal?.trim() ||
    summary?.skin_analysis?.suggested_goal?.trim() ||
    "";
  return v || null;
}

export function isClaimableGuestCoachSession(
  session: CoachWelcomePayload | null,
): boolean {
  if (!session?.starterRoutine) return false;
  // Must be an explicit guest trial — never treat a leftover logged-in session
  // as claimable just because we pass hasToken=false into isGuestCoachSession.
  if (!sessionLooksLikeGuestTrial(session)) return false;
  if (!session.reviewSummary) return false;
  if (!resolveSkinType(session) || !resolveGoal(session)) return false;
  const am = session.starterRoutine.morning?.filter((s) => s.trim()) ?? [];
  const pm = session.starterRoutine.evening?.filter((s) => s.trim()) ?? [];
  return am.length > 0 || pm.length > 0;
}

function stableConcerns(session: CoachWelcomePayload): string[] {
  const summary = session.reviewSummary;
  const fromBody = (summary?.body_concerns ?? [])
    .map((c) => c.trim())
    .filter(Boolean);
  if (fromBody.length) return [...new Set(fromBody)];

  const analysis = summary?.skin_analysis;
  const fromEnum = (analysis?.concerns ?? [])
    .map((c) => c.trim())
    .filter(Boolean);
  if (fromEnum.length) return [...new Set(fromEnum)];

  const types = (analysis?.concern_types ?? [])
    .map((c) => c.trim())
    .filter(Boolean);
  if (types.length) {
    // Map common vision types → body concern ids used by onboarding.
    const mapped = types.map((t) => {
      if (t.includes("acne") || t.includes("comedone") || t.includes("pustule")) {
        return "acne";
      }
      if (t.includes("pih") || t.includes("pigment")) return "hyperpigmentation";
      if (t.includes("redness") || t.includes("irritat")) return "redness";
      if (t.includes("dry")) return "dryness";
      if (t.includes("pore")) return "large_pores";
      return t;
    });
    return [...new Set(mapped)];
  }
  return [];
}

function trimOrUndef(s: string | undefined): string | undefined {
  const v = s?.trim();
  return v ? v : undefined;
}

/** Convert a persisted session data-URL back into an uploadable File (legacy fallback). */
export function dataUrlToPhotoItem(
  dataUrl: string,
  index: number,
): PhotoItem | null {
  const raw = dataUrl.trim();
  const m = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(raw);
  if (!m) return null;
  const mime = m[1].trim().toLowerCase() || "image/jpeg";
  const b64 = m[2].replace(/\s/g, "");
  try {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const ext = mime.includes("png")
      ? "png"
      : mime.includes("webp")
        ? "webp"
        : "jpg";
    const file = new File([bytes], `guest-claim-${index + 1}.${ext}`, {
      type: mime,
    });
    return { file, preview: raw };
  } catch {
    return null;
  }
}

/** Legacy: recover data: URLs left in sessionStorage before IndexedDB store. */
export function photosFromGuestSessionDataUrls(
  session: CoachWelcomePayload,
): PhotoItem[] {
  if (session.reviewSummary?.photos_skipped === true) return [];
  const urls = normalizeReviewPhotoUrls(session.reviewSummary?.photo_urls).slice(
    0,
    ONBOARDING_MAX_PHOTOS,
  );
  const out: PhotoItem[] = [];
  for (const url of urls) {
    if (!url.startsWith("data:")) continue;
    const item = dataUrlToPhotoItem(url, out.length);
    if (item) out.push(item);
  }
  return out;
}

/** Prefer IndexedDB blobs; fall back to legacy session data URLs. */
export async function resolveGuestClaimPhotos(
  session: CoachWelcomePayload,
): Promise<PhotoItem[]> {
  if (session.reviewSummary?.photos_skipped === true) return [];
  const fromIdb = await loadGuestClaimPhotos();
  if (fromIdb.length) return fromIdb;
  return photosFromGuestSessionDataUrls(session);
}

export type GuestClaimPayload = {
  finishBody: OnboardingFinishBody;
  /** Photos to attach in the background after a fast JSON complete. */
  photos: PhotoItem[];
};

/** Build complete + deferred photo inputs from guest coach-welcome session. */
export function buildGuestClaimPayload(
  session: CoachWelcomePayload,
  photos: PhotoItem[] = [],
): GuestClaimPayload | null {
  if (!isClaimableGuestCoachSession(session)) return null;

  const summary = session.reviewSummary!;
  const analysis = summary.skin_analysis;
  const skinType = resolveSkinType(session);
  const goal = resolveGoal(session);
  if (!skinType || !goal) return null;

  const skillRaw = summary.skill_level?.trim();
  const skill_level =
    skillRaw && skillRaw !== "unspecified" ? skillRaw : "beginner";
  const body_concerns = stableConcerns(session);
  const undertone =
    summary.undertone?.trim() ||
    analysis?.undertone_guess?.trim() ||
    "prefer_not";

  let skin_analysis: OnboardingSkinAnalyzeDTO | undefined = analysis
    ? { ...analysis }
    : undefined;
  const notes = session.coachingNotes?.trim();
  if (notes) {
    skin_analysis = skin_analysis
      ? { ...skin_analysis, coaching_notes: notes }
      : ({
          skin_type_guess: skinType,
          undertone_guess: undertone,
          concerns: body_concerns,
          suggested_goal: goal,
          barrier_signal: "unknown",
          confidence: 0.5,
          coaching_notes: notes,
          non_diagnostic: "",
          photo_quality: { sufficient: true, tips: [] },
          model_used: "guest_claim",
        } as OnboardingSkinAnalyzeDTO);
  }

  const morning = (session.starterRoutine.morning ?? [])
    .map((s) => s.trim())
    .filter(Boolean);
  const evening = (session.starterRoutine.evening ?? [])
    .map((s) => s.trim())
    .filter(Boolean);

  // Honest about recoverable files only — lost IDB/data URLs → skipped.
  const photos_skipped = photos.length === 0;

  const sr = session.starterRoutine;

  return {
    photos,
    finishBody: {
      skin_type: skinType,
      undertone,
      contexts: [],
      budget: ONBOARDING_DEFAULT_BUDGET,
      goal,
      skill_level,
      body_concerns,
      current_routine: "",
      locale: session.locale?.trim() || "vi",
      photos_skipped,
      skin_analysis,
      morning,
      evening,
      // Keep personalized trial copy when locking AM/PM (server skips BG AI).
      week_notes: trimOrUndef(sr.week_notes),
      safety_notes: trimOrUndef(sr.safety_notes),
      encouragement: trimOrUndef(sr.encouragement),
      skin_readback: trimOrUndef(sr.skin_readback),
      rationale: trimOrUndef(sr.rationale),
      closing_reminder: trimOrUndef(sr.closing_reminder),
    },
  };
}

/** Finish-body only (tests / callers that don't need photo File objects). */
export function buildFinishBodyFromGuestSession(
  session: CoachWelcomePayload,
  photos: PhotoItem[] = [],
): OnboardingFinishBody | null {
  return buildGuestClaimPayload(session, photos)?.finishBody ?? null;
}

export type ClaimGuestResult = {
  profileId: string;
  starterRoutinePending: boolean;
};

async function attachGuestPhotosInBackground(
  accessToken: string,
  photos: PhotoItem[],
  onFailed?: () => void,
): Promise<void> {
  try {
    const photoUrls = await postOnboardingPhotos(photos, accessToken);
    patchCoachWelcomeSession(
      {
        guestPhotosIdb: false,
        reviewSummary: {
          photos_skipped: false,
          photo_urls: photoUrls,
        },
      },
      { replacePhotoUrls: true },
    );
    await clearGuestClaimPhotos();
  } catch {
    onFailed?.();
  } finally {
    revokeGuestPhotoPreviews(photos);
  }
}

/**
 * Persist guest coach-welcome trial onto the newly authenticated profile.
 * Completes with fast JSON first; face photos attach in the background from IDB.
 */
export async function claimGuestCoachWelcomeIfNeeded(
  accessToken: string,
  opts?: {
    alreadyCompleted?: boolean;
    onPhotosAttachFailed?: () => void;
  },
): Promise<ClaimGuestResult | null> {
  if (opts?.alreadyCompleted) return null;

  const session = readCoachWelcomeSession();
  if (!isClaimableGuestCoachSession(session) || !session) return null;

  const photos = await resolveGuestClaimPhotos(session);
  const claim = buildGuestClaimPayload(session, photos);
  if (!claim) {
    revokeGuestPhotoPreviews(photos);
    return null;
  }

  // Fast path: never block login/register on multipart upload.
  const result = await postOnboardingComplete(
    claim.finishBody,
    [],
    true,
    accessToken,
  );

  const claimedStarter = {
    ...session.starterRoutine,
    ...result.starterRoutine,
    product_guidance:
      result.starterRoutine.product_guidance?.length
        ? result.starterRoutine.product_guidance
        : session.starterRoutine.product_guidance,
    product_suggestions:
      result.starterRoutine.product_suggestions?.length
        ? result.starterRoutine.product_suggestions
        : session.starterRoutine.product_suggestions,
  };

  const photosSkipped = claim.finishBody.photos_skipped === true;
  const claimedPhotoUrls = result.photoUrls?.length
    ? result.photoUrls
    : photosSkipped
      ? []
      : normalizeReviewPhotoUrls(session.reviewSummary?.photo_urls);

  patchCoachWelcomeSession(
    {
      profileId: result.profileId,
      guestPreview: false,
      guestPhotosIdb: photos.length > 0,
      starterRoutine: claimedStarter,
      starterRoutinePending: result.starterRoutinePending,
      previewJobId: undefined,
      previewAccessToken: undefined,
      reviewSummary: {
        ...session.reviewSummary,
        photos_skipped: photosSkipped,
        photo_urls: claimedPhotoUrls,
      },
    },
    { replacePhotoUrls: true },
  );

  const auth = useAuthStore.getState();
  if (auth.user) {
    useAuthStore.setState({
      user: {
        ...auth.user,
        onboarding_completed: true,
        onboarding_skipped: false,
      },
    });
  }
  void auth.refresh();

  if (photos.length > 0) {
    void attachGuestPhotosInBackground(
      accessToken,
      photos,
      opts?.onPhotosAttachFailed,
    );
  }

  return {
    profileId: result.profileId,
    starterRoutinePending: result.starterRoutinePending,
  };
}
