import assert from "node:assert/strict";
import vm from "node:vm";
import { describe, it } from "node:test";

import { isMetaPixelAdminPath, shouldLoadMetaPixel } from "./meta-pixel";
import {
  TIKTOK_PIXEL_ID,
  isTikTokPixelAdminPath,
  isTikTokPixelId,
  shouldLoadTikTokPixel,
  tikTokPixelBootstrap,
  trackTikTokEvent,
  trackTikTokPage,
} from "./tiktok-pixel";

describe("tiktok pixel id", () => {
  it("defaults to the production pixel when env is unset", () => {
    assert.match(TIKTOK_PIXEL_ID, /^[A-Za-z0-9]+$/);
    if (!process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID?.trim()) {
      assert.equal(TIKTOK_PIXEL_ID, "DAPQVHBC77U5PB605QBG");
    }
  });

  it("rejects ids that cannot be embedded in the snippet", () => {
    assert.equal(isTikTokPixelId("DAPQVHBC77U5PB605QBG"), true);
    assert.equal(isTikTokPixelId("bad id"), false);
    assert.equal(isTikTokPixelId("id'onload"), false);
    assert.throws(() => tikTokPixelBootstrap("id'</script>"), /Invalid TikTok pixel id/);
  });

  it("bootstraps the official loader and an initial page view", () => {
    const snippet = tikTokPixelBootstrap("DAPQVHBC77U5PB605QBG");
    assert.match(snippet, /https:\/\/analytics\.tiktok\.com\/i18n\/pixel\/events\.js/);
    assert.match(snippet, /ttq\.load\('DAPQVHBC77U5PB605QBG'\)/);
    assert.match(snippet, /ttq\.page\(\)/);
  });

  it("queues ttq.page and inserts events.js", () => {
    const scripts: { src?: string }[] = [];
    const sandbox = {
      window: {} as {
        ttq?: {
          _i?: Record<string, { _u?: string }>;
          [index: number]: unknown;
          length: number;
        };
      },
      document: {
        createElement() {
          const el: { src?: string; async?: boolean; type?: string } = {};
          scripts.push(el);
          return el;
        },
        getElementsByTagName() {
          return [{ parentNode: { insertBefore(node: unknown) { return node; } } }];
        },
      },
    };
    vm.runInNewContext(tikTokPixelBootstrap("DAPQVHBC77U5PB605QBG"), sandbox);
    const ttq = sandbox.window.ttq;
    assert.ok(ttq);
    assert.equal(
      ttq._i?.DAPQVHBC77U5PB605QBG?._u,
      "https://analytics.tiktok.com/i18n/pixel/events.js",
    );
    assert.equal(
      scripts[0]?.src,
      "https://analytics.tiktok.com/i18n/pixel/events.js?sdkid=DAPQVHBC77U5PB605QBG&lib=ttq",
    );
    const queued = JSON.parse(JSON.stringify(Array.from({ length: ttq.length }, (_, i) => ttq[i])));
    assert.deepEqual(queued, [["page"]]);
  });
});

describe("tiktok pixel gate", () => {
  it("matches Meta's prod and admin skip", () => {
    assert.equal(shouldLoadTikTokPixel(), shouldLoadMetaPixel());
    for (const path of [null, "", "/admin", "/vi/admin", "/vi/admin/users", "/en/check-in"]) {
      assert.equal(isTikTokPixelAdminPath(path), isMetaPixelAdminPath(path));
    }
    assert.equal(isTikTokPixelAdminPath("/vi/check-in"), false);
  });

  it("no-ops outside the browser", () => {
    assert.equal(typeof window, "undefined");
    trackTikTokEvent("CompleteRegistration", { status: true });
    trackTikTokPage();
  });
});
