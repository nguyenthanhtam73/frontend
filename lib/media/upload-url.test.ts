import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { absoluteUploadUrl, sameOriginUploadUrl } from "@/lib/api/admin-skin-review";
import { apiBaseUrl } from "@/lib/api";
import { displayPhotoSrc } from "@/lib/media/display-photo-src";
import {
  isExpiredSignedUploadUrl,
  isSignedUploadUrl,
  isUserUploadUrl,
  omitSignedUploadUrls,
  preferFreshProfilePhotoUrls,
  uploadObjectKey,
} from "@/lib/media/upload-url";
import {
  matchRefreshedUploadUrl,
  planUploadPhotoRecovery,
  resolveRefreshedUploadUrl,
} from "@/lib/media/refresh-signed-photo";
import { photoUrlsForSessionStorage } from "@/lib/onboarding/photo-session-urls";
import { sessionPayloadWithoutSignedPhotos } from "@/lib/onboarding/coach-welcome-session";
import { absoluteSiteUploadUrl, siteOrigin } from "@/lib/seo";
import { GUEST_COACH_PROFILE_ID } from "@/lib/types/starter-routine";

const SIGNED =
  "/uploads/2026/10/03/check-in/ada/face.jpg?exp=1893456000&sig=abc123def456";
const SIGNED_ABS =
  "https://api.dadiary.vn/uploads/2026/10/03/check-in/ada/face.jpg?exp=1893456000&sig=abc123def456";
const EXPIRED =
  "/uploads/2026/10/03/check-in/ada/face.jpg?exp=1&sig=abc123def456";
const UNSIGNED = "/uploads/2026/10/03/check-in/ada/face.jpg";
const FRESH =
  "/uploads/2026/10/03/check-in/ada/face.jpg?exp=2000000000&sig=newsig999";

describe("signed upload URLs", () => {
  it("keeps exp and sig on same-origin, absolute, and site upload helpers", () => {
    assert.equal(sameOriginUploadUrl(SIGNED), SIGNED);
    assert.equal(
      sameOriginUploadUrl(SIGNED_ABS),
      "/uploads/2026/10/03/check-in/ada/face.jpg?exp=1893456000&sig=abc123def456",
    );
    assert.equal(sameOriginUploadUrl("uploads/face.jpg?exp=10&sig=aa"), "/uploads/face.jpg?exp=10&sig=aa");
    assert.equal(sameOriginUploadUrl("data:image/png;base64,xx"), "data:image/png;base64,xx");
    assert.equal(
      absoluteUploadUrl(SIGNED),
      `${apiBaseUrl}${SIGNED}`,
    );
    assert.equal(absoluteUploadUrl(SIGNED_ABS), SIGNED_ABS);
    assert.equal(absoluteSiteUploadUrl(SIGNED), `${siteOrigin()}${SIGNED}`);
    assert.equal(
      absoluteSiteUploadUrl(SIGNED_ABS),
      `${siteOrigin()}/uploads/2026/10/03/check-in/ada/face.jpg?exp=1893456000&sig=abc123def456`,
    );
    assert.equal(
      absoluteSiteUploadUrl("face.jpg?exp=10&sig=aa"),
      `${siteOrigin()}/uploads/face.jpg?exp=10&sig=aa`,
    );
    assert.equal(displayPhotoSrc(SIGNED), SIGNED);
    assert.equal(displayPhotoSrc("data:image/png;base64,xx"), "data:image/png;base64,xx");
  });

  it("detects signed, expired, and unsigned upload URLs", () => {
    assert.equal(isUserUploadUrl(SIGNED), true);
    assert.equal(isUserUploadUrl(SIGNED_ABS), true);
    assert.equal(isUserUploadUrl("data:image/png;base64,xx"), false);
    assert.equal(isSignedUploadUrl(SIGNED), true);
    assert.equal(isSignedUploadUrl(UNSIGNED), false);
    assert.equal(isExpiredSignedUploadUrl(EXPIRED, 2_000), true);
    assert.equal(isExpiredSignedUploadUrl(SIGNED, 1_000), false);
    assert.equal(isExpiredSignedUploadUrl(UNSIGNED), false);
    assert.equal(uploadObjectKey(SIGNED), uploadObjectKey(FRESH));
    assert.equal(uploadObjectKey(SIGNED_ABS), uploadObjectKey(SIGNED));
  });

  it("does not persist signed upload URLs and prefers fresh profile photos", () => {
    assert.deepEqual(omitSignedUploadUrls([SIGNED, UNSIGNED, "data:image/png;base64,xx"]), [
      UNSIGNED,
      "data:image/png;base64,xx",
    ]);
    assert.deepEqual(
      photoUrlsForSessionStorage([SIGNED, "data:image/png;base64,xx", "blob:https://x"]),
      ["data:image/png;base64,xx"],
    );
    assert.equal(photoUrlsForSessionStorage([SIGNED]), undefined);
    assert.deepEqual(preferFreshProfilePhotoUrls([EXPIRED, "data:image/png;base64,xx"], [FRESH]), [
      FRESH,
    ]);
    assert.deepEqual(preferFreshProfilePhotoUrls([EXPIRED, UNSIGNED], undefined), [UNSIGNED]);

    const stored = sessionPayloadWithoutSignedPhotos({
      profileId: GUEST_COACH_PROFILE_ID,
      starterRoutine: {
        morning: ["Rửa mặt"],
        evening: ["Dưỡng ẩm"],
        week_notes: "",
        safety_notes: "",
        encouragement: "",
        skin_readback: "",
        rationale: "",
        closing_reminder: "",
      },
      reviewSummary: { photo_urls: [SIGNED, "data:image/png;base64,xx"] },
    });
    assert.deepEqual(stored.reviewSummary?.photo_urls, ["data:image/png;base64,xx"]);
    assert.equal(JSON.stringify(stored).includes("sig=abc123def456"), false);
  });

  it("refetches an expired upload once, then uses the placeholder", () => {
    assert.equal(planUploadPhotoRecovery(SIGNED, false), "refetch");
    assert.equal(planUploadPhotoRecovery(SIGNED, true), "placeholder");
    assert.equal(planUploadPhotoRecovery("data:image/png;base64,xx", false), "placeholder");
    assert.equal(matchRefreshedUploadUrl(EXPIRED, [FRESH, "/uploads/other.jpg"]), FRESH);
    assert.equal(matchRefreshedUploadUrl(EXPIRED, [EXPIRED]), null);
    assert.equal(matchRefreshedUploadUrl(EXPIRED, []), null);
  });

  it("re-queries only the owning progress, skin-check, or profile list", async () => {
    const calls: string[] = [];
    const loaders = {
      progress: async () => {
        calls.push("progress");
        return [FRESH];
      },
      skinCheck: async (id: string) => {
        calls.push(`skin-check:${id}`);
        return [`/uploads/check.jpg?exp=2000000000&sig=chk`];
      },
      profile: async () => {
        calls.push("profile");
        return [`/uploads/profile.jpg?exp=2000000000&sig=pro`];
      },
    };

    assert.equal(
      await resolveRefreshedUploadUrl(EXPIRED, "progress", loaders),
      FRESH,
    );
    assert.equal(
      await resolveRefreshedUploadUrl(
        "/uploads/check.jpg?exp=1&sig=old",
        "skin-check",
        loaders,
        "chk-1",
      ),
      "/uploads/check.jpg?exp=2000000000&sig=chk",
    );
    assert.equal(
      await resolveRefreshedUploadUrl("/uploads/profile.jpg?exp=1&sig=old", "profile", loaders),
      "/uploads/profile.jpg?exp=2000000000&sig=pro",
    );
    assert.equal(await resolveRefreshedUploadUrl(EXPIRED, "skin-check", loaders), null);
    assert.deepEqual(calls, ["progress", "skin-check:chk-1", "profile"]);
  });

  it("share export and the service worker keep the signed query", () => {
    const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");
    const share = fs.readFileSync(path.join(root, "lib/share/render-share-card.ts"), "utf8");
    assert.match(share, /sameOriginUploadUrl\(url\)/);
    assert.match(share, /sameOriginUploadUrl\(fresh\)/);
    const sw = fs.readFileSync(path.join(root, "public/sw.js"), "utf8");
    const bypass = sw.indexOf('url.pathname.startsWith("/uploads/")');
    const staticHit = sw.indexOf("isStaticAsset(url)");
    assert.ok(bypass > 0 && staticHit > bypass);
  });
});
