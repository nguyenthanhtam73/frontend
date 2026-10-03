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

function skipQuoted(src: string, start: number): number {
  const quote = src[start];
  if (quote !== '"' && quote !== "'" && quote !== "`") return start;
  for (let i = start + 1; i < src.length; i++) {
    if (src[i] === "\\") {
      i += 1;
      continue;
    }
    if (quote === "`" && src[i] === "$" && src[i + 1] === "{") {
      i = skipBraces(src, i + 1) - 1;
      continue;
    }
    if (src[i] === quote) return i + 1;
  }
  return src.length;
}

function skipBraces(src: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < src.length; i++) {
    const ch = src[i];
    if (ch === '"' || ch === "'" || ch === "`") {
      i = skipQuoted(src, i) - 1;
      continue;
    }
    if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return src.length;
}

/** className="...", className={`...`}, and className={...} values only. */
function classNameValues(src: string): string[] {
  const values: string[] = [];
  const attr = /className\s*=\s*/g;
  let match: RegExpExecArray | null;
  while ((match = attr.exec(src))) {
    const start = match.index + match[0].length;
    const ch = src[start];
    if (ch === '"' || ch === "'" || ch === "`") {
      const end = skipQuoted(src, start);
      values.push(src.slice(start + 1, end - 1));
    } else if (ch === "{") {
      const end = skipBraces(src, start);
      values.push(src.slice(start + 1, end - 1));
    }
  }
  return values;
}

function hasStickyOrFixedClass(src: string): boolean {
  for (const value of classNameValues(src)) {
    for (const token of value.split(/[^A-Za-z0-9_:-]+/)) {
      if (!token) continue;
      const base = token.replace(/^!/, "").split(":").pop();
      if (base === "sticky" || base === "fixed") return true;
    }
  }
  return false;
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
    assert.equal(hasStickyOrFixedClass(consent), false);
  });

  it("keeps the submit button in normal flow", () => {
    const submitIdx = pageSrc.indexOf('data-testid="register-submit"');
    const button = pageSrc.slice(submitIdx - 120, pageSrc.indexOf("</Button>", submitIdx));
    assert.match(button, /type="submit"/);
    assert.match(button, /className="w-full"/);
    assert.match(button, /disabled=\{submitHeld \|\| submitBlocked\}/);
    assert.equal(hasStickyOrFixedClass(pageSrc), false);
  });

  it("ignores sticky and fixed substrings that are not class names", () => {
    const sample = `
      // prefixed labels stay in normal flow, not position: fixed
      <p className="text-center">Note</p>
      <div className={open ? "block" : "hidden"} />
      <span className={\`w-full \${ready ? "opacity-100" : ""}\`} />
    `;
    assert.equal(hasStickyOrFixedClass(sample), false);
    assert.equal(hasStickyOrFixedClass('<div className="sticky top-0" />'), true);
    assert.equal(hasStickyOrFixedClass('<div className={"fixed inset-0"} />'), true);
    assert.equal(hasStickyOrFixedClass('<div className="sm:sticky top-0" />'), true);
    assert.equal(hasStickyOrFixedClass('<div className="!fixed inset-0" />'), true);
  });

  it("shows the captcha wait line without taking flow height", () => {
    const status = sliceBetween('data-testid="register-captcha-status"', "</p>");
    assert.match(status, /t\("captchaChecking"\)/);
    assert.match(status, /t\("captchaUnavailable"\)/);
    assert.match(status, /absolute inset-x-0 top-\[calc\(100%\+1rem\)\]/);
    assert.equal(hasStickyOrFixedClass(status), false);
    assert.match(pageSrc, /onTimeout=\{markCaptchaUnavailable\}/);
    assert.match(pageSrc, /onUnsupported=\{markCaptchaUnavailable\}/);
    assert.match(pageSrc, /onError: markCaptchaUnavailable/);
    assert.match(pageSrc, /scriptOptions=\{turnstileScriptOptions\}/);
    assert.match(pageSrc, /captchaNotice \? " invisible" : ""/);
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
