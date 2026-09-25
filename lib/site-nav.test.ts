import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hasMobileBottomChrome,
  hidesFunnelMarketingNav,
  hidesPwaInstallBanner,
  isAuthEntryPath,
  isOnboardingFunnelPath,
  normalizePath,
  revealScrollDelta,
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

  it("treats only login/register as auth-entry (wizard can still show check-in CTA)", () => {
    assert.equal(isAuthEntryPath("/login"), true);
    assert.equal(isAuthEntryPath("/register"), true);
    assert.equal(isAuthEntryPath("/en/login"), true);
    assert.equal(isAuthEntryPath("/onboarding"), false);
    assert.equal(isAuthEntryPath("/onboarding/coach-welcome"), false);
    assert.equal(isAuthEntryPath("/check-in"), false);
  });

  it("keeps coach-welcome in mobile bottom chrome", () => {
    assert.equal(hasMobileBottomChrome("/onboarding/coach-welcome"), true);
    assert.equal(hasMobileBottomChrome("/onboarding"), false);
  });

  it("hides marketing nav on check-in / onboarding / register funnel for guests", () => {
    assert.equal(hidesFunnelMarketingNav("/check-in"), true);
    assert.equal(hidesFunnelMarketingNav("/en/check-in"), true);
    assert.equal(hidesFunnelMarketingNav("/onboarding"), true);
    assert.equal(hidesFunnelMarketingNav("/onboarding/coach-welcome"), true);
    assert.equal(hidesFunnelMarketingNav("/register"), true);
    assert.equal(hidesFunnelMarketingNav("/login"), true);
    assert.equal(hidesFunnelMarketingNav("/"), false);
    assert.equal(hidesFunnelMarketingNav("/pricing"), false);
    assert.equal(hidesFunnelMarketingNav("/guides"), false);
    assert.equal(hidesFunnelMarketingNav("/progress"), false);
  });

  it("never hides the strip for signed-in users (app nav stays)", () => {
    assert.equal(hidesFunnelMarketingNav("/check-in", true), false);
    assert.equal(hidesFunnelMarketingNav("/en/check-in", true), false);
    assert.equal(hidesFunnelMarketingNav("/onboarding", true), false);
    assert.equal(hidesFunnelMarketingNav("/onboarding/coach-welcome", true), false);
    assert.equal(hidesFunnelMarketingNav("/register", true), false);
    assert.equal(hidesFunnelMarketingNav("/login", true), false);
    assert.equal(hidesFunnelMarketingNav("/", true), false);
    assert.equal(hidesFunnelMarketingNav("/progress", true), false);
  });

  it("hides the install banner on funnel + pricing", () => {
    assert.equal(hidesPwaInstallBanner("/pricing"), true);
    assert.equal(hidesPwaInstallBanner("/en/pricing"), true);
    assert.equal(hidesPwaInstallBanner("/register"), true);
    assert.equal(hidesPwaInstallBanner("/check-in"), true);
    assert.equal(hidesPwaInstallBanner("/"), false);
  });
});

describe("revealScrollDelta", () => {
  const strip = { left: 16, right: 374 };

  it("returns 0 when the item is already fully inside the strip", () => {
    assert.equal(revealScrollDelta(strip, { left: 40, right: 180 }), 0);
  });

  it("scrolls a clipped right-edge tab fully into view", () => {
    assert.equal(revealScrollDelta(strip, { left: 280, right: 420 }), 58);
  });

  it("scrolls a clipped left-edge tab fully into view", () => {
    assert.equal(revealScrollDelta(strip, { left: -20, right: 90 }), -48);
  });

  it("pins the start of a tab wider than the strip", () => {
    assert.equal(revealScrollDelta(strip, { left: 0, right: 500 }), -28);
  });
});
