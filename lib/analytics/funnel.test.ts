import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FUNNEL_EVENTS, isFunnelEventName } from "./funnel";

describe("funnel analytics", () => {
  it("exports the guest signup funnel events", () => {
    assert.equal(FUNNEL_EVENTS.photoAdded, "onboarding_photo_added");
    assert.equal(FUNNEL_EVENTS.photosSubmitted, "onboarding_photos_submitted");
    assert.equal(FUNNEL_EVENTS.routineShown, "onboarding_routine_shown");
    assert.equal(FUNNEL_EVENTS.routineAccepted, "onboarding_routine_accepted");
    assert.equal(FUNNEL_EVENTS.signupCtaClick, "onboarding_signup_cta_click");
    assert.equal(FUNNEL_EVENTS.registerSuccess, "onboarding_register_success");
    assert.equal(
      FUNNEL_EVENTS.firstCheckInCtaClick,
      "activation_first_checkin_cta_click",
    );
  });

  it("accepts only known funnel event names", () => {
    assert.equal(isFunnelEventName("onboarding_routine_shown"), true);
    assert.equal(isFunnelEventName("Purchase"), false);
  });
});
