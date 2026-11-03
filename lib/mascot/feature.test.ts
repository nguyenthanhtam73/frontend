import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mascotFeatureEnabled, mascotQueryHidesUI } from "./feature";

describe("mascot feature gate", () => {
  it("requires features.mascot to be true", () => {
    assert.equal(mascotFeatureEnabled(null), false);
    assert.equal(mascotFeatureEnabled(undefined), false);
    assert.equal(mascotFeatureEnabled({}), false);
    assert.equal(mascotFeatureEnabled({ features: null }), false);
    assert.equal(mascotFeatureEnabled({ features: {} }), false);
    assert.equal(mascotFeatureEnabled({ features: { mascot: false } }), false);
    assert.equal(mascotFeatureEnabled({ features: { mascot: true } }), true);
  });

  it("hides the UI on 404 and until a mascot payload arrives", () => {
    assert.equal(mascotQueryHidesUI({ isSuccess: false, data: undefined }), true);
    assert.equal(mascotQueryHidesUI({ isSuccess: true, data: null }), true);
    assert.equal(mascotQueryHidesUI({ isSuccess: true, data: { mood: "happy" } }), false);
  });
});
