import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAuthHrefWithNext,
  readAuthReturnPathFromSearch,
  roomInviteReturnPath,
  sanitizeAuthReturnPath,
} from "../auth/return-path";

describe("auth return-path", () => {
  it("allows check-in and rejects open redirects", () => {
    assert.equal(sanitizeAuthReturnPath("/check-in"), "/check-in");
    assert.equal(sanitizeAuthReturnPath("/check-in?x=1"), "/check-in?x=1");
    assert.equal(sanitizeAuthReturnPath("/privacy"), "/privacy");
    assert.equal(sanitizeAuthReturnPath("/terms"), "/terms");
    assert.equal(sanitizeAuthReturnPath("/delete-account"), "/delete-account");
    assert.equal(sanitizeAuthReturnPath("https://evil.com/check-in"), null);
    assert.equal(sanitizeAuthReturnPath("//evil.com"), null);
    assert.equal(sanitizeAuthReturnPath("/admin"), null);
    assert.equal(sanitizeAuthReturnPath("/be-da/phong/DA7K2M"), "/be-da/phong/DA7K2M");
    assert.equal(sanitizeAuthReturnPath("https://evil.com/be-da/phong/DA7K2M"), null);
    assert.equal(sanitizeAuthReturnPath("//evil.com/be-da/phong/DA7K2M"), null);
  });

  it("keeps only an internal room invite as the auth return", () => {
    assert.equal(roomInviteReturnPath("/be-da/phong/DA7K2M"), "/be-da/phong/DA7K2M");
    assert.equal(roomInviteReturnPath("/be-da/phong/da7k2m"), null);
    assert.equal(roomInviteReturnPath("/be-da/phong/../check-in"), null);
    assert.equal(roomInviteReturnPath("https://evil.com/be-da/phong/DA7K2M"), null);
    assert.equal(roomInviteReturnPath("/check-in"), null);
    assert.equal(
      buildAuthHrefWithNext("/register", "/be-da/phong/DA7K2M"),
      "/register?next=%2Fbe-da%2Fphong%2FDA7K2M",
    );
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
