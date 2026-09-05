import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hasMobileBottomChrome,
  isOnboardingFunnelPath,
  normalizePath,
} from "./site-nav";

describe("site-nav funnel helpers", () => {
  it("normalizes trailing slashes", () => {
    assert.equal(normalizePath("/onboarding/"), "/onboarding");
    assert.equal(normalizePath("/onboarding/coach-welcome?x=1"), "/onboarding/coach-welcome");
  });

  it("treats onboarding + coach-welcome as the signup funnel", () => {
    assert.equal(isOnboardingFunnelPath("/onboarding"), true);
    assert.equal(isOnboardingFunnelPath("/onboarding/coach-welcome"), true);
    assert.equal(isOnboardingFunnelPath("/en/onboarding/coach-welcome"), true);
    assert.equal(isOnboardingFunnelPath("/register"), true);
    assert.equal(isOnboardingFunnelPath("/login"), true);
    assert.equal(isOnboardingFunnelPath("/check-in"), false);
    assert.equal(isOnboardingFunnelPath("/"), false);
  });

  it("keeps coach-welcome in mobile bottom chrome", () => {
    assert.equal(hasMobileBottomChrome("/onboarding/coach-welcome"), true);
    assert.equal(hasMobileBottomChrome("/onboarding"), false);
  });
});
