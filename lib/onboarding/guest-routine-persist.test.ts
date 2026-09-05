import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { slimGuestRoutinePayload } from "./guest-routine-persist";
import { GUEST_COACH_PROFILE_ID } from "@/lib/types/starter-routine";

describe("slimGuestRoutinePayload", () => {
  it("keeps routine steps and drops transient photo URLs", () => {
    const slim = slimGuestRoutinePayload({
      profileId: GUEST_COACH_PROFILE_ID,
      guestPreview: true,
      starterRoutine: {
        morning: ["Rửa mặt"],
        evening: ["Dưỡng ẩm"],
        week_notes: "week",
        safety_notes: "safety",
        encouragement: "go",
        skin_readback: "read",
        rationale: "why",
        closing_reminder: "remind",
      },
      starterRoutinePending: true,
      previewJobId: "job",
      previewAccessToken: "secret",
      reviewSummary: {
        skin_type: "combo",
        goal: "clear_acne",
        photo_urls: ["data:image/png;base64,xx", "/uploads/face.jpg", "blob:https://x"],
        skin_analysis: {
          skin_type_guess: "combo",
          undertone_guess: "prefer_not",
          concerns: ["acne"],
          suggested_goal: "clear_acne",
          barrier_signal: "unknown",
          confidence: 0.7,
          coaching_notes: "ok",
          non_diagnostic: "",
          photo_quality: { sufficient: true, tips: [] },
          model_used: "test",
          product_guidance: [{ title: "drop me" } as never],
        },
      },
    });

    assert.equal(slim.guestPreview, true);
    assert.equal(slim.starterRoutinePending, false);
    assert.equal(slim.previewJobId, undefined);
    assert.equal(slim.previewAccessToken, undefined);
    assert.deepEqual(slim.starterRoutine.morning, ["Rửa mặt"]);
    assert.deepEqual(slim.reviewSummary?.photo_urls, ["/uploads/face.jpg"]);
    assert.equal(slim.reviewSummary?.skin_analysis?.coaching_notes, "ok");
    assert.equal(slim.reviewSummary?.skin_analysis?.product_guidance, undefined);
  });
});
