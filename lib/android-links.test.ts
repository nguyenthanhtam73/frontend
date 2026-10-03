import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { getRedirectStatus } from "next/dist/lib/redirect-status.js";
import { tryToParsePath } from "next/dist/lib/try-to-parse-path.js";

import nextConfig from "../next.config";
import { APEX_ORIGIN, WWW_HOST, wwwToApexRedirects } from "./www-redirect";

const ASSETLINKS = `[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "vn.dadiary.app",
      "sha256_cert_fingerprints": [
        "BC:60:FE:4B:D0:70:6E:8F:C8:B4:9F:EB:14:43:0E:F6:71:7A:6A:62:95:8A:44:47:DB:23:02:FA:32:F8:57:7A"
      ]
    }
  }
]
`;

function readMiddlewareMatcher(): string {
  const src = fs.readFileSync(path.join(process.cwd(), "middleware.ts"), "utf8");
  const match = src.match(/matcher:\s*\[\s*("(?:\\.|[^"\\])*")\s*\]/);
  assert.ok(match, "middleware matcher literal");
  return JSON.parse(match[1]) as string;
}

/** Same wrapping as Next's getMiddlewareMatchers when i18n and basePath are unset. */
function compileMiddlewareMatcher(source: string): RegExp {
  const wrapped = `/:nextData(_next/data/[^/]{1,})?${source}{(\\.json)}?`;
  const parsed = tryToParsePath(wrapped);
  assert.equal(parsed.error, undefined);
  assert.ok(parsed.regexStr);
  return new RegExp(parsed.regexStr);
}

describe("Android asset links", () => {
  it("publishes the exact assetlinks.json statement", () => {
    const file = path.join(process.cwd(), "public/.well-known/assetlinks.json");
    assert.equal(fs.readFileSync(file, "utf8"), ASSETLINKS);
  });

  it("keeps /.well-known out of the i18n middleware", () => {
    const matcher = compileMiddlewareMatcher(readMiddlewareMatcher());
    assert.equal(matcher.test("/.well-known/assetlinks.json"), false);
    assert.equal(matcher.test("/.well-known/assetlinks"), false);
    assert.equal(matcher.test("/check-in"), true);
    assert.equal(matcher.test("/"), true);
    assert.equal(matcher.test("/api/me"), false);
    assert.equal(matcher.test("/landing"), false);
  });

  it("does not let the service worker handle /.well-known", () => {
    const sw = fs.readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");
    const fetchAt = sw.indexOf('self.addEventListener("fetch"');
    const bypassAt = sw.indexOf('if (url.pathname.startsWith("/.well-known/")) return;', fetchAt);
    const respondAt = sw.indexOf("event.respondWith", fetchAt);
    assert.ok(fetchAt >= 0);
    assert.ok(bypassAt > fetchAt);
    assert.ok(respondAt > bypassAt);
  });
});

describe("www to apex redirect", () => {
  it("is a 308 host rule that keeps the path and ignores other hosts", () => {
    const rules = wwwToApexRedirects();
    assert.equal(rules.length, 1);
    const rule = rules[0];
    assert.equal(rule.source, "/:path*");
    assert.equal(rule.destination, `${APEX_ORIGIN}/:path*`);
    assert.deepEqual(rule.has, [{ type: "host", value: WWW_HOST }]);
    assert.equal(WWW_HOST, "www.dadiary.vn");
    assert.equal(APEX_ORIGIN, "https://dadiary.vn");
    assert.equal(rule.permanent, true);
    assert.equal(getRedirectStatus(rule), 308);
    assert.equal(rule.destination.startsWith(`${APEX_ORIGIN}/`), true);
  });

  it("is the redirect next.config installs, and rewrites stay on /uploads", async () => {
    assert.deepEqual(await nextConfig.redirects!(), wwwToApexRedirects());
    const rewrites = await nextConfig.rewrites!();
    assert.ok(Array.isArray(rewrites));
    assert.deepEqual(
      rewrites.map((rule) => rule.source),
      ["/uploads/:path*"],
    );
  });
});
