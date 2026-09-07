import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { softGaugeFeel, softGaugeFeelKey } from "./soft-gauge-feel";

describe("softGaugeFeel", () => {
  it("maps 0–1 into today's-feel buckets, not exam grades", () => {
    assert.equal(softGaugeFeel(0.2), "low");
    assert.equal(softGaugeFeel(0.55), "mid");
    assert.equal(softGaugeFeel(0.8), "ok");
    assert.equal(softGaugeFeelKey(0.2), "gaugeFeelLow");
    assert.equal(softGaugeFeelKey(0.55), "gaugeFeelMid");
    assert.equal(softGaugeFeelKey(0.85), "gaugeFeelOk");
  });

  it("clamps out-of-range values", () => {
    assert.equal(softGaugeFeel(-1), "low");
    assert.equal(softGaugeFeel(2), "ok");
  });
});
