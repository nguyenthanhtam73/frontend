import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { appPathKey, isSameAppRoute, resolveInternalPathname } from "./app-path";

describe("app-path navigation helpers", () => {
  it("normalizes locale-prefixed paths", () => {
    assert.equal(appPathKey("/routine"), "/routine");
    assert.equal(appPathKey("/en/routine"), "/routine");
    assert.equal(appPathKey("/en"), "/");
  });

  it("detects same app route across locales", () => {
    assert.equal(isSameAppRoute("/routine", "/en/routine"), true);
    assert.equal(isSameAppRoute("/routine", "/check-in"), false);
  });

  it("resolves internal pathname from relative href", () => {
    assert.equal(
      resolveInternalPathname("/check-in", "http://localhost:3000"),
      "/check-in",
    );
    assert.equal(
      resolveInternalPathname("https://evil.test/nope", "http://localhost:3000"),
      null,
    );
  });
});
