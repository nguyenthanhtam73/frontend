import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  findPendingMilestone,
  shouldLockPremiumMilestones,
  STREAK_MILESTONES,
} from "./milestones";

describe("shouldLockPremiumMilestones", () => {
  it("does not gate the full catalog before the first check-in", () => {
    assert.equal(
      shouldLockPremiumMilestones({
        neverCheckedIn: true,
        premiumFullLocked: true,
      }),
      false,
    );
    assert.equal(
      shouldLockPremiumMilestones({
        neverCheckedIn: true,
        premiumFullLocked: false,
      }),
      false,
    );
  });

  it("keeps the Free lock after the user has checked in", () => {
    assert.equal(
      shouldLockPremiumMilestones({
        neverCheckedIn: false,
        premiumFullLocked: true,
      }),
      true,
    );
    assert.equal(
      shouldLockPremiumMilestones({
        neverCheckedIn: false,
        premiumFullLocked: false,
      }),
      false,
    );
  });
});

describe("findPendingMilestone", () => {
  it("returns nothing at streak 0", () => {
    assert.equal(findPendingMilestone(0, new Set(), STREAK_MILESTONES), null);
  });
});
