import { apiBaseUrl } from "@/lib/api";
import { ONBOARDING_DEFAULT_BUDGET } from "@/lib/onboarding/constants";
import { patchCoachWelcomeSession } from "@/lib/onboarding/coach-welcome-session";
import type { CoachWelcomePayload, StarterRoutineDTO } from "@/lib/types/starter-routine";

type PreviewCompletePayload = {
  success?: boolean;
  data?: {
    starter_routine?: StarterRoutineDTO;
    starter_routine_pending?: boolean;
    preview_job_id?: string;
    preview_access_token?: string;
  };
};

export type GuestPreviewJob = {
  jobId: string;
  accessToken: string;
};

/** Start (or restart) the guest background AI job from cached onboarding answers. */
export async function requestGuestPreviewJob(
  session: CoachWelcomePayload,
): Promise<GuestPreviewJob | null> {
  const summary = session.reviewSummary;
  if (!summary?.skin_type || !summary.goal || !summary.skill_level) return null;

  const bodyConcerns = summary.body_concerns ?? [];
  if (bodyConcerns.length === 0) return null;

  const locale = session.locale === "en" ? "en" : "vi";

  try {
    const res = await fetch(`${apiBaseUrl}/api/v1/onboarding/preview-complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        skin_type: summary.skin_type,
        undertone: summary.undertone ?? "prefer_not",
        contexts: [],
        budget: ONBOARDING_DEFAULT_BUDGET,
        goal: summary.goal,
        skill_level: summary.skill_level,
        body_concerns: bodyConcerns,
        current_routine: "",
        locale,
        photos_skipped: summary.photos_skipped === true,
        skin_analysis: summary.skin_analysis,
      }),
    });
    const payload = (await res.json().catch(() => ({}))) as PreviewCompletePayload;

    if (!res.ok || !payload.success || !payload.data) return null;

    const jobId = payload.data.preview_job_id;
    const accessToken = payload.data.preview_access_token;
    if (!jobId || !accessToken) return null;

    if (payload.data.starter_routine_pending === true) {
      patchCoachWelcomeSession({
        previewJobId: jobId,
        previewAccessToken: accessToken,
        starterRoutinePending: true,
      });
      return { jobId, accessToken };
    }

    if (payload.data.starter_routine) {
      patchCoachWelcomeSession({
        starterRoutine: payload.data.starter_routine,
        starterRoutinePending: false,
        previewJobId: jobId,
        previewAccessToken: accessToken,
      });
    }
    return { jobId, accessToken };
  } catch {
    return null;
  }
}
