import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveAuthReturnDestination } from "./post-auth-destination";

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
