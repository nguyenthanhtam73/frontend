import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  postRegisterDestination,
  resolveAuthReturnDestination,
} from "./post-auth-destination";

describe("resolveAuthReturnDestination", () => {
  it("sends incomplete users to onboarding when next is gated", () => {
    const user = { id: "u1", onboarding_completed: false };
    assert.equal(
      resolveAuthReturnDestination(user, "/check-in"),
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
  it("sends claimed / guest-trial register to coach-welcome", () => {
    assert.equal(
      postRegisterDestination({
        claimed: true,
        hadClaimableGuest: false,
        user: { id: "u1", onboarding_completed: true },
        returnPath: "/pricing",
      }),
      "/onboarding/coach-welcome",
    );
    assert.equal(
      postRegisterDestination({
        claimed: false,
        hadClaimableGuest: true,
        user: { id: "u1", onboarding_completed: false },
        returnPath: null,
      }),
      "/onboarding/coach-welcome",
    );
  });

  it("defaults completed users to /check-in when there is no claim", () => {
    assert.equal(
      postRegisterDestination({
        claimed: false,
        hadClaimableGuest: false,
        user: { id: "u1", onboarding_completed: true },
        returnPath: null,
      }),
      "/check-in",
    );
  });

  it("keeps incomplete users on onboarding when there is no claim", () => {
    assert.equal(
      postRegisterDestination({
        claimed: false,
        hadClaimableGuest: false,
        user: { id: "u1", onboarding_completed: false },
        returnPath: "/check-in",
      }),
      "/onboarding",
    );
  });
});
