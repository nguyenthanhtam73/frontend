import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { rectInside } from "./before-after";
import {
  MIN_STREAK_CONTINUE_DAYS,
  STREAK_CARD_SIZE,
  shouldCelebrateStreakContinue,
  streakCardLayout,
  streakShareFilename,
} from "./streak-continue";

describe("shouldCelebrateStreakContinue", () => {
  it("requires a real continued streak of at least 2 from this submit", () => {
    assert.equal(MIN_STREAK_CONTINUE_DAYS, 2);
    assert.equal(
      shouldCelebrateStreakContinue({
        currentStreak: 2,
        submittedThisSession: true,
        hasPendingMilestone: false,
      }),
      true,
    );
    assert.equal(
      shouldCelebrateStreakContinue({
        currentStreak: 6,
        submittedThisSession: true,
        hasPendingMilestone: false,
      }),
      true,
    );
  });

  it("hides for first check-in, reloads, and pending milestones", () => {
    assert.equal(
      shouldCelebrateStreakContinue({
        currentStreak: 1,
        submittedThisSession: true,
        hasPendingMilestone: false,
      }),
      false,
    );
    assert.equal(
      shouldCelebrateStreakContinue({
        currentStreak: 4,
        submittedThisSession: false,
        hasPendingMilestone: false,
      }),
      false,
    );
    assert.equal(
      shouldCelebrateStreakContinue({
        currentStreak: 7,
        submittedThisSession: true,
        hasPendingMilestone: true,
      }),
      false,
    );
    assert.equal(
      shouldCelebrateStreakContinue({
        currentStreak: null,
        submittedThisSession: true,
        hasPendingMilestone: false,
      }),
      false,
    );
  });
});

describe("streak share card helpers", () => {
  it("names the PNG from the day count", () => {
    assert.equal(streakShareFilename(12), "dadiary-streak-12.png");
    assert.equal(streakShareFilename(2.9), "dadiary-streak-2.png");
    assert.equal(streakShareFilename(Number.NaN), "dadiary-streak-0.png");
  });

  it("keeps brand / number / footer inside the square card", () => {
    const layout = streakCardLayout();
    assert.equal(layout.width, STREAK_CARD_SIZE);
    const canvas = { x: 0, y: 0, w: layout.width, h: layout.height };
    assert.equal(rectInside(layout.brand, canvas), true);
    assert.equal(rectInside(layout.number, canvas), true);
    assert.equal(rectInside(layout.footer, canvas), true);
  });
});
