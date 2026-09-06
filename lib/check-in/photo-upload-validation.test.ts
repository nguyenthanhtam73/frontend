import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CHECKIN_PHOTO_MAX_BYTES,
  validateCheckInPhoto,
} from "./photo-upload-validation";

function fileOf(name: string, type: string, size = 64): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("validateCheckInPhoto", () => {
  it("accepts backend-safe raster types", () => {
    assert.equal(validateCheckInPhoto(fileOf("face.jpg", "image/jpeg")), null);
    assert.equal(validateCheckInPhoto(fileOf("face.png", "image/png")), null);
    assert.equal(validateCheckInPhoto(fileOf("face.webp", "image/webp")), null);
    assert.equal(validateCheckInPhoto(fileOf("face.gif", "image/gif")), null);
  });

  it("accepts HEIC/HEIF so the iPhone picker can stage a file (convert before POST)", () => {
    assert.equal(validateCheckInPhoto(fileOf("IMG_1.HEIC", "image/heic")), null);
    assert.equal(validateCheckInPhoto(fileOf("IMG_1.heif", "image/heif")), null);
    assert.equal(validateCheckInPhoto(fileOf("IMG_1.heic", "")), null);
  });

  it("rejects empty, oversized, and unknown types", () => {
    assert.equal(validateCheckInPhoto(fileOf("empty.jpg", "image/jpeg", 0)), "empty");
    assert.equal(
      validateCheckInPhoto(
        fileOf("huge.jpg", "image/jpeg", CHECKIN_PHOTO_MAX_BYTES + 1),
      ),
      "too_large",
    );
    assert.equal(validateCheckInPhoto(fileOf("notes.pdf", "application/pdf")), "invalid_type");
    assert.equal(validateCheckInPhoto(fileOf("shot.bmp", "image/bmp")), "invalid_type");
  });
});
