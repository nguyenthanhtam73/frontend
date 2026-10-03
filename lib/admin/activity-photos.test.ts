import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { adminActivityPhotoCount } from "@/lib/admin/activity-photos";

describe("admin activity photo count", () => {
  it("uses photo_count when photo_urls is missing", () => {
    assert.equal(adminActivityPhotoCount({ photo_count: 3 }), 3);
    assert.equal(
      adminActivityPhotoCount({ has_photos: true, photo_count: 3, photo_urls: undefined } as {
        photo_count: number;
        photo_urls?: string[];
      }),
      3,
    );
    assert.equal(adminActivityPhotoCount({ photo_count: 0 }), 0);
  });

  it("falls back to photo_urls length only when the count is absent", () => {
    assert.equal(adminActivityPhotoCount({ photo_urls: ["/uploads/a.jpg", "/uploads/b.jpg"] }), 2);
    assert.equal(adminActivityPhotoCount({}), 0);
    assert.equal(adminActivityPhotoCount({ photo_urls: null }), 0);
  });

  it("does not render thumbnails from photo_urls", () => {
    const src = fs.readFileSync(
      path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        "../../components/admin/activity-admin-view.tsx",
      ),
      "utf8",
    );
    assert.match(src, /adminActivityPhotoCount\(row\)/);
    assert.equal(src.includes("photo_urls"), false);
    assert.equal(src.includes("<img"), false);
  });
});
