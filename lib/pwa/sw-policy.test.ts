import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { appCacheNames, CLEAR_APP_CACHES_MESSAGE } from "@/lib/clear-app-caches";
import { isCacheableStaticAsset, shouldBypassServiceWorker } from "@/lib/pwa/sw-policy";

const swPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../public/sw.js");

describe("service worker upload bypass", () => {
  it("does not cache /uploads photos, including jpg on the API host", () => {
    const sameOrigin = new URL(
      "https://dadiary.vn/uploads/2026/10/03/face.jpg?exp=1893456000&sig=abc",
    );
    const apiHost = new URL(
      "https://api.dadiary.vn/uploads/2026/10/03/face.jpg?exp=1893456000&sig=abc",
    );
    const icon = new URL("https://dadiary.vn/icons/icon-192.png");
    const hashed = new URL("https://dadiary.vn/_next/static/chunks/app.js");

    assert.equal(shouldBypassServiceWorker(sameOrigin), true);
    assert.equal(shouldBypassServiceWorker(apiHost), true);
    assert.equal(isCacheableStaticAsset(sameOrigin), false);
    assert.equal(isCacheableStaticAsset(apiHost), false);
    assert.equal(isCacheableStaticAsset(icon), true);
    assert.equal(isCacheableStaticAsset(hashed), true);
    assert.equal(shouldBypassServiceWorker(icon), false);
  });

  it("bumps cache names and clears dadiary caches on CLEAR_CACHES", () => {
    const sw = fs.readFileSync(swPath, "utf8");
    assert.match(sw, /const CACHE_VERSION = "v19"/);
    assert.match(sw, /dadiary-static-\$\{CACHE_VERSION\}/);
    assert.match(sw, /dadiary-api-\$\{CACHE_VERSION\}/);
    const bypass = sw.indexOf('if (url.pathname.startsWith("/uploads/")) return;');
    const staticHit = sw.indexOf("if (isStaticAsset(url))");
    assert.ok(bypass > 0 && staticHit > bypass);
    assert.match(sw, /type === "CLEAR_CACHES"/);
    assert.match(sw, /key\.startsWith\("dadiary-"\)/);
    assert.equal(CLEAR_APP_CACHES_MESSAGE, "CLEAR_CACHES");
    assert.deepEqual(
      appCacheNames([
        "dadiary-api-v16",
        "dadiary-static-v17",
        "other-cache",
        "dadiary-html-v17",
      ]),
      ["dadiary-api-v16", "dadiary-static-v17", "dadiary-html-v17"],
    );
  });

  it("logout asks the app to clear those caches", () => {
    const logout = fs.readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "../stores/auth-store.ts"),
      "utf8",
    );
    assert.match(logout, /clearAppCaches\(\)/);
  });
});
