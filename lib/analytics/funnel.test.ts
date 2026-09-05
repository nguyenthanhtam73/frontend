import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  FUNNEL_EVENTS,
  claimOnceFlag,
  funnelEventForCheckInKind,
  funnelOnceKey,
  isFunnelEventName,
  paywallViewParams,
  resolveCheckInFunnelKinds,
} from "./funnel";

describe("funnel analytics", () => {
  it("exports guest → paid funnel events", () => {
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
    assert.equal(FUNNEL_EVENTS.firstCheckIn, "activation_first_checkin");
    assert.equal(FUNNEL_EVENTS.d1CheckIn, "activation_d1_checkin");
    assert.equal(FUNNEL_EVENTS.d1ReminderShown, "activation_d1_reminder_shown");
    assert.equal(FUNNEL_EVENTS.paywallView, "paywall_view");
    assert.equal(FUNNEL_EVENTS.checkoutConfirm, "checkout_confirm");
    assert.equal(FUNNEL_EVENTS.paid, "paid");
  });

  it("accepts only known funnel event names", () => {
    assert.equal(isFunnelEventName("onboarding_routine_shown"), true);
    assert.equal(isFunnelEventName("activation_first_checkin"), true);
    assert.equal(isFunnelEventName("paywall_view"), true);
    assert.equal(isFunnelEventName("Purchase"), false);
  });
});

describe("resolveCheckInFunnelKinds", () => {
  it("emits first on a D0 first check-in", () => {
    assert.deepEqual(
      resolveCheckInFunnelKinds({ neverCheckedIn: true, reminderKind: "d0" }),
      ["first"],
    );
  });

  it("emits first + d1 when the first check-in is a day-1 return", () => {
    assert.deepEqual(
      resolveCheckInFunnelKinds({ neverCheckedIn: true, reminderKind: "d1" }),
      ["first", "d1"],
    );
  });

  it("emits only d1 when they already have history but missed yesterday", () => {
    assert.deepEqual(
      resolveCheckInFunnelKinds({ neverCheckedIn: false, reminderKind: "d1" }),
      ["d1"],
    );
  });

  it("emits nothing for keep / already-checked-in / unknown", () => {
    assert.deepEqual(
      resolveCheckInFunnelKinds({ neverCheckedIn: false, reminderKind: "keep" }),
      [],
    );
    assert.deepEqual(
      resolveCheckInFunnelKinds({ neverCheckedIn: false, reminderKind: null }),
      [],
    );
  });

  it("maps kinds to stable event names", () => {
    assert.equal(
      funnelEventForCheckInKind("first"),
      FUNNEL_EVENTS.firstCheckIn,
    );
    assert.equal(funnelEventForCheckInKind("d1"), FUNNEL_EVENTS.d1CheckIn);
  });
});

describe("paywallViewParams", () => {
  it("defaults feature to generic and keeps recommended plan", () => {
    assert.deepEqual(
      paywallViewParams({ surface: "upsell_banner" }),
      { surface: "upsell_banner", feature: "generic" },
    );
    assert.deepEqual(
      paywallViewParams({
        surface: "pricing",
        feature: "ai_routine_suggestion",
        recommendedPlan: "premium",
      }),
      {
        surface: "pricing",
        feature: "ai_routine_suggestion",
        recommended_plan: "premium",
      },
    );
  });
});

describe("claimOnceFlag", () => {
  it("builds a stable once key and claims it once", () => {
    assert.equal(
      funnelOnceKey("paywall_view", "upsell:wardrobe_full"),
      "dadiary_funnel_once_paywall_view:upsell:wardrobe_full",
    );
    const mem = new Map<string, string>();
    const store = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v);
      },
    };
    assert.equal(claimOnceFlag(store, "k"), true);
    assert.equal(claimOnceFlag(store, "k"), false);
    assert.equal(claimOnceFlag(null, "k"), true);
  });
});
