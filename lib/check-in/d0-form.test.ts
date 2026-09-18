import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isNeverCheckedInCheckIn, shouldShowD0StickyActions } from "./d0-form";

describe("isNeverCheckedInCheckIn", () => {
  it("treats guests and empty streak as D0", () => {
    assert.equal(isNeverCheckedInCheckIn({ streak: null }), true);
    assert.equal(isNeverCheckedInCheckIn({ streak: undefined }), true);
    assert.equal(isNeverCheckedInCheckIn({ streak: { current_streak: 0 } }), true);
  });

  it("turns off after a completed server check-in", () => {
    assert.equal(
      isNeverCheckedInCheckIn({ streak: { current_streak: 1 } }),
      false,
    );
    assert.equal(
      isNeverCheckedInCheckIn({
        streak: { current_streak: 0, first_check_in_date: "2026-09-17" },
      }),
      false,
    );
  });

  it("turns off after a successful first check-in this session", () => {
    assert.equal(
      isNeverCheckedInCheckIn({
        streak: null,
        completedThisSession: true,
      }),
      false,
    );
  });
});

describe("shouldShowD0StickyActions", () => {
  it("shows take-photo + skip before submit is enabled", () => {
    assert.equal(
      shouldShowD0StickyActions({
        neverCheckedIn: true,
        skipMode: false,
        canSubmit: false,
      }),
      true,
    );
  });

  it("hides once a photo is staged, skip is on, or the user already checked in", () => {
    assert.equal(
      shouldShowD0StickyActions({
        neverCheckedIn: true,
        skipMode: false,
        canSubmit: true,
      }),
      false,
    );
    assert.equal(
      shouldShowD0StickyActions({
        neverCheckedIn: true,
        skipMode: true,
        canSubmit: false,
      }),
      false,
    );
    assert.equal(
      shouldShowD0StickyActions({
        neverCheckedIn: false,
        skipMode: false,
        canSubmit: false,
      }),
      false,
    );
  });
});
