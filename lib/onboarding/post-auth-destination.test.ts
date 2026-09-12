import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isOnboardingGatedPath,
  postRegisterDestination,
  resolveAuthReturnDestination,
} from "./post-auth-destination";

describe("isOnboardingGatedPath", () => {
  it("keeps check-in open so D0/D1 CTAs are not a dead end", () => {
    assert.equal(isOnboardingGatedPath("/check-in"), false);
    assert.equal(isOnboardingGatedPath("/check-in/"), false);
    assert.equal(isOnboardingGatedPath("/routine"), true);
    assert.equal(isOnboardingGatedPath("/progress"), true);
    assert.equal(isOnboardingGatedPath("/cabinet"), true);
    assert.equal(isOnboardingGatedPath("/wardrobe"), true);
    assert.equal(isOnboardingGatedPath("/"), false);
  });
});

describe("resolveAuthReturnDestination", () => {
  it("honors next=/check-in for incomplete users", () => {
    const user = { id: "u1", onboarding_completed: false };
    assert.equal(
      resolveAuthReturnDestination(user, "/check-in"),
      "/check-in",
    );
  });

  it("sends incomplete users to onboarding when next is still gated", () => {
    const user = { id: "u1", onboarding_completed: false };
    assert.equal(
      resolveAuthReturnDestination(user, "/routine"),
      "/onboarding",
    );
  });

  it("honors next for completed users", () => {
    const user = { id: "u1", onboarding_completed: true };
    assert.equal(
      resolveAuthReturnDestination(user, "/check-in"),
      "/check-in",
    );
  });

  it("falls back when next missing", () => {
    assert.equal(
      resolveAuthReturnDestination(
        { id: "u1", onboarding_completed: true },
        null,
      ),
      "/check-in",
    );
    assert.equal(
      resolveAuthReturnDestination(
        { id: "u1", onboarding_completed: false },
        null,
      ),
      "/onboarding",
    );
  });
});

describe("postRegisterDestination", () => {
  it("sends claimed check-in + guest-trial register to coach-welcome", () => {
    assert.equal(
      postRegisterDestination({
        claimed: true,
        hadClaimableGuest: false,
        claimedCheckIn: true,
        user: { id: "u1", onboarding_completed: true },
        returnPath: "/pricing",
      }),
      "/onboarding/coach-welcome",
    );
    assert.equal(
      postRegisterDestination({
        claimed: false,
        hadClaimableGuest: true,
        claimedCheckIn: true,
        user: { id: "u1", onboarding_completed: false },
        returnPath: null,
      }),
      "/onboarding/coach-welcome",
    );
  });

  it("keeps D0 on /check-in when check-in is unclaimed, even with a guest routine", () => {
    assert.equal(
      postRegisterDestination({
        claimed: true,
        hadClaimableGuest: true,
        claimedCheckIn: false,
        user: { id: "u1", onboarding_completed: false },
        returnPath: "/onboarding/coach-welcome",
      }),
      "/check-in",
    );
    assert.equal(
      postRegisterDestination({
        claimed: false,
        hadClaimableGuest: true,
        claimedCheckIn: false,
        user: { id: "u1", onboarding_completed: false },
        returnPath: null,
      }),
      "/check-in",
    );
  });

  it("honors next=/check-in when check-in is unclaimed", () => {
    assert.equal(
      postRegisterDestination({
        claimed: true,
        hadClaimableGuest: true,
        claimedCheckIn: false,
        user: { id: "u1", onboarding_completed: false },
        returnPath: "/check-in",
      }),
      "/check-in",
    );
  });

  it("prefers /check-in after a guest check-in claim fail", () => {
    assert.equal(
      postRegisterDestination({
        claimed: true,
        hadClaimableGuest: true,
        claimedCheckIn: false,
        user: { id: "u1", onboarding_completed: true },
        returnPath: "/onboarding/coach-welcome",
      }),
      "/check-in",
    );
  });

  it("defaults completed users to /check-in when there is no claim", () => {
    assert.equal(
      postRegisterDestination({
        claimed: false,
        hadClaimableGuest: false,
        claimedCheckIn: false,
        user: { id: "u1", onboarding_completed: true },
        returnPath: null,
      }),
      "/check-in",
    );
  });

  it("sends incomplete users to check-in when there is no claim", () => {
    assert.equal(
      postRegisterDestination({
        claimed: false,
        hadClaimableGuest: false,
        claimedCheckIn: false,
        user: { id: "u1", onboarding_completed: false },
        returnPath: null,
      }),
      "/check-in",
    );
    assert.equal(
      postRegisterDestination({
        claimed: false,
        hadClaimableGuest: false,
        claimedCheckIn: false,
        user: { id: "u1", onboarding_completed: false },
        returnPath: "/check-in",
      }),
      "/check-in",
    );
  });

  it("still blocks incomplete register next= onto remaining gated shells after a claimed check-in", () => {
    assert.equal(
      postRegisterDestination({
        claimed: false,
        hadClaimableGuest: false,
        claimedCheckIn: true,
        user: { id: "u1", onboarding_completed: false },
        returnPath: "/routine",
      }),
      "/onboarding",
    );
  });

  it("sends unclaimed D0 to /check-in instead of a gated next=", () => {
    assert.equal(
      postRegisterDestination({
        claimed: false,
        hadClaimableGuest: false,
        claimedCheckIn: false,
        user: { id: "u1", onboarding_completed: false },
        returnPath: "/routine",
      }),
      "/check-in",
    );
  });
});
