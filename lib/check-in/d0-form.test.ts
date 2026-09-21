import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canRequestSubmitAfterD0StickySkip,
  isNeverCheckedInCheckIn,
  shouldShowD0StickyActions,
  userNoteForD0StickySkipSubmit,
} from "./d0-form";
import { canSubmitCheckIn, isSkipModeReady } from "./check-in-submit";

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

describe("userNoteForD0StickySkipSubmit", () => {
  const canned = "First check-in without photo";

  it("fills a canned note when skip-mode would not be ready", () => {
    assert.equal(
      userNoteForD0StickySkipSubmit({
        conditions: [],
        symptoms: [],
        userNote: "",
        cannedNote: canned,
      }),
      canned,
    );
    assert.equal(
      userNoteForD0StickySkipSubmit({
        conditions: [],
        symptoms: [],
        userNote: "   ",
        cannedNote: canned,
      }),
      canned,
    );
  });

  it("keeps an existing note or tags instead of overwriting", () => {
    assert.equal(
      userNoteForD0StickySkipSubmit({
        conditions: [],
        symptoms: [],
        userNote: "a bit dry",
        cannedNote: canned,
      }),
      "a bit dry",
    );
    assert.equal(
      userNoteForD0StickySkipSubmit({
        conditions: ["oily"],
        symptoms: [],
        userNote: "",
        cannedNote: canned,
      }),
      "",
    );
  });
});

describe("canRequestSubmitAfterD0StickySkip", () => {
  it("submits only after sticky skip has entered skip-ready state", () => {
    assert.equal(
      canRequestSubmitAfterD0StickySkip({
        pending: true,
        skipMode: true,
        skipModeReady: true,
      }),
      true,
    );
    assert.equal(
      canRequestSubmitAfterD0StickySkip({
        pending: false,
        skipMode: true,
        skipModeReady: true,
      }),
      false,
    );
    assert.equal(
      canRequestSubmitAfterD0StickySkip({
        pending: true,
        skipMode: false,
        skipModeReady: true,
      }),
      false,
    );
    assert.equal(
      canRequestSubmitAfterD0StickySkip({
        pending: true,
        skipMode: true,
        skipModeReady: false,
      }),
      false,
    );
  });

  it("sticky skip canned note makes skip-mode submit-ready", () => {
    const userNote = userNoteForD0StickySkipSubmit({
      conditions: [],
      symptoms: [],
      userNote: "",
      cannedNote: "Check-in không ảnh — lần đầu",
    });
    const skipModeReady = isSkipModeReady({
      conditions: [],
      symptoms: [],
      userNote,
    });
    assert.equal(skipModeReady, true);
    assert.equal(
      canSubmitCheckIn({ skipMode: true, photoCount: 0, skipModeReady }),
      true,
    );
    assert.equal(
      canRequestSubmitAfterD0StickySkip({
        pending: true,
        skipMode: true,
        skipModeReady,
      }),
      true,
    );
  });
});
