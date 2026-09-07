import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isUncertainPhotoEvidence,
  resolveCoachPhotoEvidence,
} from "./coach-evidence";

describe("resolveCoachPhotoEvidence", () => {
  it("treats empty image_urls as skip", () => {
    const ev = resolveCoachPhotoEvidence({ imageUrls: [] });
    assert.equal(ev.kind, "skip");
    assert.deepEqual(ev.chips, ["skip", "tags_only", "not_certain"]);
    assert.equal(isUncertainPhotoEvidence(ev.kind), true);
  });

  it("treats blank image urls as skip", () => {
    const ev = resolveCoachPhotoEvidence({ imageUrls: ["  ", ""] });
    assert.equal(ev.kind, "skip");
  });

  it("uses backend photo_evidence=limited even when photos exist", () => {
    const ev = resolveCoachPhotoEvidence({
      imageUrls: ["/uploads/a.jpg"],
      photoEvidence: "limited",
    });
    assert.equal(ev.kind, "limited");
    assert.deepEqual(ev.chips, ["limited", "retake", "not_certain"]);
  });

  it("honors photo_limited flag", () => {
    const ev = resolveCoachPhotoEvidence({
      imageUrls: ["/uploads/a.jpg"],
      photoLimited: true,
    });
    assert.equal(ev.kind, "limited");
  });

  it("lets backend skip win over photos (stale urls)", () => {
    const ev = resolveCoachPhotoEvidence({
      imageUrls: ["/uploads/a.jpg"],
      photoEvidence: "skipped_no_photo",
    });
    assert.equal(ev.kind, "skip");
  });

  it("is ok when photos exist and no limited flag", () => {
    const ev = resolveCoachPhotoEvidence({
      imageUrls: ["/uploads/a.jpg"],
    });
    assert.equal(ev.kind, "ok");
    assert.deepEqual(ev.chips, []);
    assert.equal(isUncertainPhotoEvidence(ev.kind), false);
  });
});
