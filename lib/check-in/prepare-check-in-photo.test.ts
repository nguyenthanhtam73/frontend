import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isHeicLikeFile, prepareCheckInPhoto } from "./prepare-check-in-photo";

function fileOf(name: string, type: string, size = 64): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("isHeicLikeFile", () => {
  it("detects HEIC/HEIF by mime or extension", () => {
    assert.equal(isHeicLikeFile(fileOf("IMG_1.HEIC", "image/heic")), true);
    assert.equal(isHeicLikeFile(fileOf("IMG_1.heif", "image/heif")), true);
    assert.equal(isHeicLikeFile(fileOf("IMG_1.heic", "")), true);
    assert.equal(isHeicLikeFile(fileOf("IMG_1.HEIF", "application/octet-stream")), true);
    assert.equal(isHeicLikeFile(fileOf("face.jpg", "image/jpeg")), false);
    assert.equal(isHeicLikeFile(fileOf("face.png", "image/png")), false);
  });
});

describe("prepareCheckInPhoto", () => {
  it("passes jpeg/png through unchanged", async () => {
    const jpeg = fileOf("face.jpg", "image/jpeg");
    const png = fileOf("face.png", "image/png");
    assert.deepEqual(await prepareCheckInPhoto(jpeg), { file: jpeg });
    assert.deepEqual(await prepareCheckInPhoto(png), { file: png });
  });

  it("does not upload original HEIC when the browser cannot decode it", async () => {
    const heic = fileOf("IMG_0001.HEIC", "image/heic");
    const result = await prepareCheckInPhoto(heic);
    assert.deepEqual(result, { error: "heic_convert_failed" });
  });

  it("surfaces validation errors before conversion", async () => {
    assert.deepEqual(await prepareCheckInPhoto(fileOf("empty.heic", "image/heic", 0)), {
      error: "empty",
    });
    assert.deepEqual(await prepareCheckInPhoto(fileOf("notes.pdf", "application/pdf")), {
      error: "invalid_type",
    });
  });
});
