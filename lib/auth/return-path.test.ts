import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAuthHrefWithNext,
  readAuthReturnPathFromSearch,
  sanitizeAuthReturnPath,
} from "../auth/return-path";

describe("auth return-path", () => {
  it("allows check-in and rejects open redirects", () => {
    assert.equal(sanitizeAuthReturnPath("/check-in"), "/check-in");
    assert.equal(sanitizeAuthReturnPath("/check-in?x=1"), "/check-in?x=1");
    assert.equal(sanitizeAuthReturnPath("https://evil.com/check-in"), null);
    assert.equal(sanitizeAuthReturnPath("//evil.com"), null);
    assert.equal(sanitizeAuthReturnPath("/admin"), null);
  });

  it("reads next or returnUrl", () => {
    const sp = new URLSearchParams("next=/check-in");
    assert.equal(readAuthReturnPathFromSearch(sp), "/check-in");
    const sp2 = new URLSearchParams("returnUrl=/routine");
    assert.equal(readAuthReturnPathFromSearch(sp2), "/routine");
  });

  it("builds register/login href with next", () => {
    assert.equal(
      buildAuthHrefWithNext("/register", "/check-in"),
      "/register?next=%2Fcheck-in",
    );
  });
});
