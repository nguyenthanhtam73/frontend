import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canSubmitCheckIn, isSkipModeReady } from "./check-in-submit";

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
