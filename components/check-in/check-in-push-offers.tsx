"use client";

import { useState } from "react";

import { FirstCheckInPushNudge } from "@/components/check-in/first-check-in-push-nudge";
import { PostCheckInPushReshow } from "@/components/check-in/post-check-in-push-reshow";
import type { CreateSkinCheckResponseDTO } from "@/lib/types/skin-check";

type Props = {
  completed: boolean;
  payload: CreateSkinCheckResponseDTO;
  signedIn: boolean;
};

/** First-check-in nudge, plus a one-time server-driven re-show after check-in. */
export function CheckInPushOffers({ completed, payload, signedIn }: Props) {
  const [firstNudgeVisible, setFirstNudgeVisible] = useState(false);
  const [firstNudgeReady, setFirstNudgeReady] = useState(false);

  return (
    <>
      <FirstCheckInPushNudge
        completed={completed}
        payload={payload}
        onVisibilityChange={setFirstNudgeVisible}
        onReadyChange={setFirstNudgeReady}
      />
      {signedIn && completed ? (
        <PostCheckInPushReshow
          key={payload.check.id}
          checkInId={payload.check.id}
          firstNudgeReady={firstNudgeReady}
          firstNudgeVisible={firstNudgeVisible}
        />
      ) : null}
    </>
  );
}
