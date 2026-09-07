import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  GUEST_AI_WAIT_MS,
  GUEST_AI_WAIT_PROGRESS_CAP,
  GUEST_AI_WAIT_STATUS_COUNT,
  guestAiWaitProgress,
  guestAiWaitStatusStep,
  isGuestAiWaitActive,
  shouldGuestAiWait,
} from "./guest-ai-wait";

describe("shouldGuestAiWait", () => {
  it("waits only on the local photos path", () => {
    assert.equal(shouldGuestAiWait({ hasPhotos: true, skipMode: false }), true);
    assert.equal(shouldGuestAiWait({ hasPhotos: false, skipMode: true }), false);
    assert.equal(shouldGuestAiWait({ hasPhotos: false, skipMode: false }), false);
    assert.equal(shouldGuestAiWait({ hasPhotos: true, skipMode: true }), false);
  });
});

describe("guestAiWaitProgress", () => {
  it("eases toward the cap, then snaps to 100 at duration", () => {
    assert.equal(guestAiWaitProgress(0), 0);
    const mid = guestAiWaitProgress(GUEST_AI_WAIT_MS / 2);
    assert.ok(mid > 0 && mid <= GUEST_AI_WAIT_PROGRESS_CAP);
    assert.equal(guestAiWaitProgress(GUEST_AI_WAIT_MS - 1), GUEST_AI_WAIT_PROGRESS_CAP);
    assert.equal(guestAiWaitProgress(GUEST_AI_WAIT_MS), 100);
    assert.equal(guestAiWaitProgress(GUEST_AI_WAIT_MS + 2_000), 100);
  });
});

describe("guestAiWaitStatusStep", () => {
  it("rotates through the guest status lines", () => {
    assert.equal(guestAiWaitStatusStep(0), 0);
    assert.equal(guestAiWaitStatusStep(2_099), 0);
    assert.equal(guestAiWaitStatusStep(2_100), 1);
    assert.equal(guestAiWaitStatusStep(4_200), 2);
    assert.equal(guestAiWaitStatusStep(6_300) % GUEST_AI_WAIT_STATUS_COUNT, 0);
  });
});

describe("isGuestAiWaitActive", () => {
  it("treats submit + process as waiting", () => {
    assert.equal(isGuestAiWaitActive("idle"), false);
    assert.equal(isGuestAiWaitActive("submitting"), true);
    assert.equal(isGuestAiWaitActive("processing"), true);
    assert.equal(isGuestAiWaitActive("done"), false);
  });
});
