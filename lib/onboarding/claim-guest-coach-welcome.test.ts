import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildFinishBodyFromGuestSession,
  buildGuestClaimPayload,
  dataUrlToPhotoItem,
  isClaimableGuestCoachSession,
  photosFromGuestSessionDataUrls,
  sessionLooksLikeGuestTrial,
} from "./claim-guest-coach-welcome";
import { GUEST_COACH_PROFILE_ID } from "@/lib/types/starter-routine";
import type { CoachWelcomePayload } from "@/lib/types/starter-routine";

/** 1×1 PNG — small enough for unit tests. */
const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function sampleGuestSession(
  overrides?: Partial<CoachWelcomePayload>,
): CoachWelcomePayload {
  return {
    profileId: GUEST_COACH_PROFILE_ID,
    guestPreview: true,
    locale: "vi",
    starterRoutine: {
      morning: ["Rửa mặt dịu"],
      evening: ["Kem dưỡng làm dịu"],
      week_notes: "Tuần đầu nhẹ nhàng",
      safety_notes: "Chưa dùng acid",
      encouragement: "Mày làm được!",
      skin_readback: "Da đang dịu dần",
      rationale: "Ưu tiên làm dịu",
      closing_reminder: "Mai check-in nhé",
    },
    reviewSummary: {
      skin_type: "sensitive",
      undertone: "warm",
      goal: "clear_acne",
      skill_level: "beginner",
      body_concerns: ["acne", "redness"],
      photos_skipped: true,
      skin_analysis: {
        skin_type_guess: "sensitive",
        undertone_guess: "warm",
        concerns: ["acne"],
        suggested_goal: "clear_acne",
        barrier_signal: "possibly_compromised",
        confidence: 0.8,
        coaching_notes: "Tóm lại da mày đang viêm — ưu tiên dịu.",
        non_diagnostic: "",
        photo_quality: { sufficient: true, tips: [] },
        model_used: "test",
        severity_level: "moderate",
        primary_regions: ["cheeks"],
        phase: "calm_first",
      },
    },
    coachingNotes: "Tóm lại da mày đang viêm — ưu tiên dịu.",
    ...overrides,
  };
}

describe("claim-guest-coach-welcome", () => {
  it("detects claimable guest sessions", () => {
    assert.equal(isClaimableGuestCoachSession(sampleGuestSession()), true);
    assert.equal(isClaimableGuestCoachSession(null), false);
  });

  it("rejects leftover non-guest sessions even without a token", () => {
    const leftover = sampleGuestSession({
      profileId: "11111111-1111-1111-1111-111111111111",
      guestPreview: false,
    });
    assert.equal(sessionLooksLikeGuestTrial(leftover), false);
    assert.equal(isClaimableGuestCoachSession(leftover), false);
  });

  it("rejects guest sessions missing review summary or skin/goal", () => {
    assert.equal(
      isClaimableGuestCoachSession(
        sampleGuestSession({ reviewSummary: undefined }),
      ),
      false,
    );
    const noSkin = sampleGuestSession();
    noSkin.reviewSummary = {
      ...noSkin.reviewSummary!,
      skin_type: undefined,
      skin_analysis: {
        ...noSkin.reviewSummary!.skin_analysis!,
        skin_type_guess: "",
      },
    };
    assert.equal(isClaimableGuestCoachSession(noSkin), false);

    const noGoal = sampleGuestSession();
    noGoal.reviewSummary = {
      ...noGoal.reviewSummary!,
      goal: undefined,
      skin_analysis: {
        ...noGoal.reviewSummary!.skin_analysis!,
        suggested_goal: "",
      },
    };
    assert.equal(isClaimableGuestCoachSession(noGoal), false);
  });

  it("builds finish body with locked AM/PM + coach copy", () => {
    const body = buildFinishBodyFromGuestSession(sampleGuestSession());
    assert.ok(body);
    assert.equal(body!.skin_type, "sensitive");
    assert.equal(body!.goal, "clear_acne");
    assert.deepEqual(body!.morning, ["Rửa mặt dịu"]);
    assert.deepEqual(body!.evening, ["Kem dưỡng làm dịu"]);
    assert.equal(body!.photos_skipped, true);
    assert.equal(body!.skin_analysis?.phase, "calm_first");
    assert.equal(body!.week_notes, "Tuần đầu nhẹ nhàng");
    assert.equal(body!.encouragement, "Mày làm được!");
    assert.equal(body!.skin_readback, "Da đang dịu dần");
  });

  it("marks photos skipped when no recoverable files", () => {
    const withIntent = sampleGuestSession({
      guestPhotosIdb: true,
      reviewSummary: {
        ...sampleGuestSession().reviewSummary!,
        photos_skipped: false,
      },
    });
    const body = buildFinishBodyFromGuestSession(withIntent, []);
    assert.ok(body);
    assert.equal(body!.photos_skipped, true);
  });

  it("marks photos not skipped when claim photos are provided", () => {
    const item = dataUrlToPhotoItem(TINY_PNG, 0);
    assert.ok(item);
    const payload = buildGuestClaimPayload(sampleGuestSession(), [item!]);
    assert.ok(payload);
    assert.equal(payload!.finishBody.photos_skipped, false);
    assert.equal(payload!.photos.length, 1);
  });

  it("falls back body_concerns from goal when summary has none", () => {
    const session = sampleGuestSession();
    session.reviewSummary = {
      ...session.reviewSummary!,
      body_concerns: [],
      skin_analysis: {
        ...session.reviewSummary!.skin_analysis!,
        concerns: [],
        concern_types: [],
      },
    };
    const body = buildFinishBodyFromGuestSession(session);
    assert.ok(body);
    assert.ok(body!.body_concerns.length > 0);
    assert.equal(body!.body_concerns[0], "acne");
  });

  it("rehydrates legacy data-URL photos", () => {
    const withPhotos = sampleGuestSession({
      reviewSummary: {
        ...sampleGuestSession().reviewSummary!,
        photos_skipped: false,
        photo_urls: [TINY_PNG, "blob:http://localhost/dead"],
      },
    });
    const photos = photosFromGuestSessionDataUrls(withPhotos);
    assert.equal(photos.length, 1);
    assert.equal(photos[0]!.file.type, "image/png");
    assert.ok(photos[0]!.file.size > 0);
  });

  it("decodes a data URL into a File", () => {
    const item = dataUrlToPhotoItem(TINY_PNG, 0);
    assert.ok(item);
    assert.equal(item!.file.name, "guest-claim-1.png");
  });
});
