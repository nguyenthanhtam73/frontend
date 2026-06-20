import { apiBaseUrl } from "@/lib/api";
import type { OnboardingFinishBody } from "@/lib/onboarding/finish-body";
import {
  assertOnboardingFinishPayload,
  fetchOnboardingAi,
  OnboardingAiError,
  parseJsonSafe,
} from "@/lib/onboarding/onboarding-ai";
import { ONBOARDING_FINISH_TIMEOUT_MS, ONBOARDING_MAX_PHOTOS } from "@/lib/onboarding/constants";
import type { PhotoItem } from "@/lib/stores/onboarding-store";
import type { StarterRoutineDTO } from "@/lib/types/starter-routine";

export type OnboardingCompleteResult = {
  profileId: string;
  starterRoutine: StarterRoutineDTO;
  starterRoutinePending: boolean;
  photoUrls?: string[];
};

type CompletePayload = {
  success?: boolean;
  data?: {
    profile?: { id?: string; photo_urls?: string[] };
    starter_routine?: StarterRoutineDTO;
    starter_routine_pending?: boolean;
  };
};

type PreviewPayload = {
  success?: boolean;
  data?: {
    starter_routine?: StarterRoutineDTO;
    starter_routine_pending?: boolean;
    preview_job_id?: string;
  };
};

export type GuestPreviewResult = {
  starterRoutine?: StarterRoutineDTO;
  starterRoutinePending: boolean;
  previewJobId?: string;
};

export async function postOnboardingComplete(
  finishBody: OnboardingFinishBody,
  photos: PhotoItem[],
  photosSkipped: boolean,
  token: string,
): Promise<OnboardingCompleteResult> {
  const hasPhotos = !photosSkipped && photos.length > 0;
  let res: Response;

  if (hasPhotos) {
    const fd = new FormData();
    fd.append("payload", JSON.stringify(finishBody));
    photos.slice(0, ONBOARDING_MAX_PHOTOS).forEach((p) => {
      fd.append("images", p.file);
    });
    res = await fetchOnboardingAi(
      `${apiBaseUrl}/api/v1/profile/onboarding/complete`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      },
      ONBOARDING_FINISH_TIMEOUT_MS,
    );
  } else {
    res = await fetchOnboardingAi(
      `${apiBaseUrl}/api/v1/profile/onboarding/complete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(finishBody),
      },
      ONBOARDING_FINISH_TIMEOUT_MS,
    );
  }

  const payload = (await parseJsonSafe(res)) as CompletePayload;
  assertOnboardingFinishPayload(res, payload);

  const profileId = payload.data?.profile?.id;
  const starterRoutine = payload.data?.starter_routine;
  if (!profileId || !starterRoutine) {
    throw new OnboardingAiError("server");
  }

  return {
    profileId,
    starterRoutine,
    starterRoutinePending: payload.data?.starter_routine_pending === true,
    photoUrls: payload.data?.profile?.photo_urls,
  };
}

export async function postGuestPreviewComplete(
  finishBody: OnboardingFinishBody,
): Promise<GuestPreviewResult> {
  const res = await fetchOnboardingAi(
    `${apiBaseUrl}/api/v1/onboarding/preview-complete`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(finishBody),
    },
    ONBOARDING_FINISH_TIMEOUT_MS,
  );

  const payload = (await parseJsonSafe(res)) as PreviewPayload;
  assertOnboardingFinishPayload(res, payload);

  const data = payload.data;
  if (!data) {
    throw new OnboardingAiError("server");
  }

  if (data.starter_routine_pending === true && data.preview_job_id) {
    return {
      starterRoutinePending: true,
      previewJobId: data.preview_job_id,
    };
  }

  if (data.starter_routine) {
    return {
      starterRoutine: data.starter_routine,
      starterRoutinePending: false,
      previewJobId: data.preview_job_id,
    };
  }

  throw new OnboardingAiError("server");
}

/** Fire-and-forget profile save after user chose default routine. */
export function postOnboardingCompleteBackground(
  finishBody: OnboardingFinishBody,
  photos: PhotoItem[],
  photosSkipped: boolean,
  token: string,
  onSuccess: (result: OnboardingCompleteResult) => void,
): void {
  void postOnboardingComplete(finishBody, photos, photosSkipped, token)
    .then(onSuccess)
    .catch(() => {
      /* user already on coach-welcome with default routine */
    });
}
