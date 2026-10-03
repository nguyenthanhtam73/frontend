import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const pageSrc = fs.readFileSync(
  path.join(
    process.cwd(),
    "app/[locale]/(marketing)/register/page.tsx",
  ),
  "utf8",
);

function sliceBetween(startMarker: string, endMarker: string): string {
  const start = pageSrc.indexOf(startMarker);
  const end = pageSrc.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0, `missing ${startMarker}`);
  assert.ok(end > start, `missing ${endMarker} after ${startMarker}`);
  return pageSrc.slice(start, end);
}

describe("register form above-the-fold layout", () => {
  it("places the legal consent directly under the submit button", () => {
    const submitIdx = pageSrc.indexOf('data-testid="register-submit"');
    const consentIdx = pageSrc.indexOf('data-testid="register-legal-consent"');
    assert.ok(submitIdx > 0, "expected register submit button");
    assert.ok(consentIdx > submitIdx, "consent should follow the submit button");

    const consent = sliceBetween(
      'data-testid="register-legal-consent"',
      "</p>",
    );
    assert.match(consent, /\{t\("legalConsent"\)\}/);
    assert.match(consent, /<LegalInlineLinks \/>/);
    assert.doesNotMatch(consent, /sticky|fixed/);
  });

  it("keeps the submit button in normal flow", () => {
    const submitIdx = pageSrc.indexOf('data-testid="register-submit"');
    const button = pageSrc.slice(submitIdx - 80, pageSrc.indexOf("</Button>", submitIdx));
    assert.match(button, /type="submit"/);
    assert.match(button, /className="w-full"/);
    assert.match(button, /disabled=\{submitHeld \|\| submitBlocked\}/);
    assert.doesNotMatch(button, /sticky|fixed/);
    assert.doesNotMatch(pageSrc, /sticky|fixed/);
  });

  it("shows the email hint only when there is an error", () => {
    assert.doesNotMatch(pageSrc, /\\u00a0/);
    assert.doesNotMatch(pageSrc, /min-h-5/);
    const emailField = sliceBetween('htmlFor="register-email"', "</Field>");
    assert.match(emailField, /\{emailError \? \(/);
    assert.match(emailField, /id="register-email-error"/);
    assert.match(emailField, /role="alert"/);
    assert.match(
      emailField,
      /aria-describedby=\{emailError \? "register-email-error" : undefined\}/,
    );
    assert.match(pageSrc, /data-testid="register-email-taken"/);
  });

  it("uses interaction-only Turnstile without a reserved idle box", () => {
    assert.match(pageSrc, /appearance:\s*"interaction-only"/);
    assert.match(pageSrc, /onExpire=\{invalidateCaptcha\}/);
    assert.match(pageSrc, /onError=\{invalidateCaptcha\}/);
    assert.match(pageSrc, /onBeforeInteractive=\{onTurnstileBeforeInteractive\}/);
    assert.match(pageSrc, /captchaEnabled && !turnstileToken/);

    const slot = sliceBetween('data-testid="register-turnstile"', "</div>");
    assert.match(slot, /"absolute h-0 w-0 overflow-hidden"/);
    assert.doesNotMatch(slot, /min-h-/);
    assert.match(slot, /\{t\("captchaHint"\)\}/);
    assert.match(slot, /turnstileInteractive \?/);
  });
});
