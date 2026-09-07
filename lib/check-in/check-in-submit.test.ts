import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildSkinCheckFormData,
  canSubmitCheckIn,
  isSkipModeReady,
} from "./check-in-submit";

describe("isSkipModeReady", () => {
  it("requires a tag or a non-empty note", () => {
    assert.equal(
      isSkipModeReady({ conditions: [], symptoms: [], userNote: "" }),
      false,
    );
    assert.equal(
      isSkipModeReady({ conditions: [], symptoms: [], userNote: "   " }),
      false,
    );
    assert.equal(
      isSkipModeReady({ conditions: ["oily"], symptoms: [], userNote: "" }),
      true,
    );
    assert.equal(
      isSkipModeReady({ conditions: [], symptoms: ["itching"], userNote: "" }),
      true,
    );
    assert.equal(
      isSkipModeReady({ conditions: [], symptoms: [], userNote: "a bit dry" }),
      true,
    );
  });
});

describe("canSubmitCheckIn", () => {
  it("blocks photo mode until a photo is staged", () => {
    assert.equal(
      canSubmitCheckIn({ skipMode: false, photoCount: 0, skipModeReady: true }),
      false,
    );
    assert.equal(
      canSubmitCheckIn({ skipMode: false, photoCount: 1, skipModeReady: false }),
      true,
    );
  });

  it("does not treat tags as enough while still in photo mode", () => {
    assert.equal(
      canSubmitCheckIn({ skipMode: false, photoCount: 0, skipModeReady: true }),
      false,
    );
  });

  it("allows skip mode only after a tag or note", () => {
    assert.equal(
      canSubmitCheckIn({ skipMode: true, photoCount: 0, skipModeReady: false }),
      false,
    );
    assert.equal(
      canSubmitCheckIn({ skipMode: true, photoCount: 0, skipModeReady: true }),
      true,
    );
  });
});

describe("buildSkinCheckFormData", () => {
  it("sets skip_mode and keeps check-in fields for a later claim POST", () => {
    const fd = buildSkinCheckFormData({
      skipMode: true,
      files: [],
      title: "t",
      userNote: "n",
      environmentNote: "e",
      conditions: ["oily"],
      symptoms: ["itching"],
      skillMode: "beginner",
      locale: "vi",
    });
    assert.equal(fd.get("skip_mode"), "true");
    assert.equal(fd.get("images"), null);
    assert.equal(fd.get("user_note"), "n");
    assert.equal(fd.get("visibility"), "private");
    assert.equal(fd.get("conditions"), JSON.stringify(["oily"]));
  });
});
