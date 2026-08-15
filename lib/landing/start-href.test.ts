import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { LANDING_START_HREF, landingStartHref } from "./start-href";

describe("landingStartHref", () => {
  it("sends marketing CTAs to guest onboarding", () => {
    assert.equal(LANDING_START_HREF, "/onboarding");
    assert.equal(landingStartHref(), "/onboarding");
  });
});
