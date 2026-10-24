import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { CHECKIN_PHOTO_MAX_BYTES } from "./photo-upload-validation";
import {
  CHECKIN_HEIC_JPEG_QUALITY,
  CHECKIN_HEIC_MAX_EDGE,
  CHECKIN_PHOTO_JPEG_QUALITY,
  CHECKIN_PHOTO_MAX_EDGE,
  CHECKIN_PHOTO_SKIP_UNDER_BYTES,
  checkInCompressOptions,
  isHeicLikeFile,
  prepareCheckInPhoto,
  resolveCheckInPreparedFile,
} from "./prepare-check-in-photo";

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

describe("check-in compress options", () => {
  it("matches Android at 1600px and JPEG 0.85, including after HEIC conversion", () => {
    assert.equal(CHECKIN_PHOTO_MAX_EDGE, 1600);
    assert.equal(CHECKIN_PHOTO_JPEG_QUALITY, 0.85);
    assert.equal(CHECKIN_PHOTO_SKIP_UNDER_BYTES, 700_000);
    assert.equal(CHECKIN_HEIC_MAX_EDGE, 1600);
    assert.equal(CHECKIN_HEIC_JPEG_QUALITY, 0.85);

    const jpeg = checkInCompressOptions(false);
    assert.equal(jpeg.maxEdge, 1600);
    assert.equal(jpeg.quality, 0.85);
    assert.equal(jpeg.skipUnderBytes, 700_000);
    assert.equal(jpeg.skipOnlyJpeg, false);
    assert.equal(jpeg.allowSkip, true);
    assert.equal(jpeg.orientFromExif, true);
    assert.equal(jpeg.includePreview, false);
    assert.equal(jpeg.fallbackIfNotSmaller, true);
    assert.equal(jpeg.throwOnFailure, false);

    const heic = checkInCompressOptions(true);
    assert.equal(heic.maxEdge, 1600);
    assert.equal(heic.quality, 0.85);
    assert.equal(heic.allowSkip, false);
    assert.equal(heic.fallbackIfNotSmaller, false);
    assert.equal(heic.throwOnFailure, true);
    assert.equal(heic.orientFromExif, true);
  });
});

describe("resolveCheckInPreparedFile", () => {
  it("falls back to the original when compression throws or the file grows", () => {
    const original = fileOf("face.jpg", "image/jpeg", 2_000_000);
    const thrown = resolveCheckInPreparedFile({
      original,
      prepared: null,
      heic: false,
    });
    assert.deepEqual(thrown, { file: original });

    const empty = resolveCheckInPreparedFile({
      original,
      prepared: fileOf("face.jpg", "image/jpeg", 0),
      heic: false,
    });
    assert.deepEqual(empty, { file: original });

    const bigger = fileOf("face.jpg", "image/jpeg", original.size + 1);
    const grew = resolveCheckInPreparedFile({
      original,
      prepared: bigger,
      heic: false,
    });
    assert.deepEqual(grew, { file: original });
  });

  it("uploads the compressed file when it is smaller or the same size", () => {
    const original = fileOf("face.jpg", "image/jpeg", 2_000_000);
    const smaller = fileOf("face.jpg", "image/jpeg", 180_000);
    assert.deepEqual(
      resolveCheckInPreparedFile({ original, prepared: smaller, heic: false }),
      { file: smaller },
    );
    const equal = fileOf("face.jpg", "image/jpeg", original.size);
    assert.deepEqual(
      resolveCheckInPreparedFile({ original, prepared: equal, heic: false }),
      { file: equal },
    );
  });

  it("never returns the original HEIC, even when the JPEG is larger", () => {
    const original = fileOf("IMG_0001.HEIC", "image/heic", 400_000);
    assert.deepEqual(
      resolveCheckInPreparedFile({ original, prepared: null, heic: true }),
      { error: "heic_convert_failed" },
    );
    assert.deepEqual(
      resolveCheckInPreparedFile({ original, prepared: original, heic: true }),
      { error: "heic_convert_failed" },
    );

    const jpeg = fileOf("IMG_0001.jpg", "image/jpeg", original.size + 50_000);
    assert.deepEqual(
      resolveCheckInPreparedFile({ original, prepared: jpeg, heic: true }),
      { file: jpeg },
    );
  });

  it("rejects an empty or over-cap HEIC conversion", () => {
    const original = fileOf("IMG_0001.HEIC", "image/heic", 400_000);
    assert.deepEqual(
      resolveCheckInPreparedFile({
        original,
        prepared: fileOf("IMG_0001.jpg", "image/jpeg", 0),
        heic: true,
      }),
      { error: "empty" },
    );
    assert.deepEqual(
      resolveCheckInPreparedFile({
        original,
        prepared: fileOf("IMG_0001.jpg", "image/jpeg", CHECKIN_PHOTO_MAX_BYTES + 1),
        heic: true,
      }),
      { error: "too_large" },
    );
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
