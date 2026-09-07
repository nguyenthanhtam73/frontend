import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  hasMobileBottomChrome,
  hidesFunnelMarketingNav,
  hidesPwaInstallBanner,
  isAuthEntryPath,
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

  it("hides marketing nav on check-in / onboarding / register funnel", () => {
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

  it("hides the install banner on funnel + pricing", () => {
    assert.equal(hidesPwaInstallBanner("/pricing"), true);
    assert.equal(hidesPwaInstallBanner("/en/pricing"), true);
    assert.equal(hidesPwaInstallBanner("/register"), true);
    assert.equal(hidesPwaInstallBanner("/check-in"), true);
    assert.equal(hidesPwaInstallBanner("/"), false);
  });
});
