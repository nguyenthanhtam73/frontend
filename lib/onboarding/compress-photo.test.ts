import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ONBOARDING_PHOTO_JPEG_QUALITY,
  ONBOARDING_PHOTO_MAX_EDGE,
  ONBOARDING_PHOTO_SKIP_UNDER_BYTES,
  fileAfterCompressionFallback,
  scaledPhotoDimensions,
  shouldSkipReencodeForFile,
} from "./compress-photo";

function fileOf(name: string, type: string, size: number): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("onboarding compress defaults", () => {
  it("keeps the existing onboarding cap, quality, and skip threshold", () => {
    assert.equal(ONBOARDING_PHOTO_MAX_EDGE, 1280);
    assert.equal(ONBOARDING_PHOTO_JPEG_QUALITY, 0.88);
    assert.equal(ONBOARDING_PHOTO_SKIP_UNDER_BYTES, 500_000);
  });
});

describe("shouldSkipReencodeForFile", () => {
  const onboarding = {
    maxEdge: ONBOARDING_PHOTO_MAX_EDGE,
    skipUnderBytes: ONBOARDING_PHOTO_SKIP_UNDER_BYTES,
    skipOnlyJpeg: true,
    allowSkip: true,
  };

  it("skips an onboarding JPEG that is already small and within the cap", () => {
    assert.equal(
      shouldSkipReencodeForFile({
        ...onboarding,
        mime: "image/jpeg",
        byteSize: 500_000,
        longEdge: 1280,
      }),
      true,
    );
  });

  it("does not skip when the file is over the size threshold or the long edge", () => {
    assert.equal(
      shouldSkipReencodeForFile({
        ...onboarding,
        mime: "image/jpeg",
        byteSize: 500_001,
        longEdge: 800,
      }),
      false,
    );
    assert.equal(
      shouldSkipReencodeForFile({
        ...onboarding,
        mime: "image/jpeg",
        byteSize: 100_000,
        longEdge: 1281,
      }),
      false,
    );
  });

  it("does not skip onboarding PNG even when it is small", () => {
    assert.equal(
      shouldSkipReencodeForFile({
        ...onboarding,
        mime: "image/png",
        byteSize: 100_000,
        longEdge: 800,
      }),
      false,
    );
  });

  it("skips a check-in photo only when it is small and the long edge is already <= 1600", () => {
    const checkIn = {
      maxEdge: 1600,
      skipUnderBytes: 700_000,
      skipOnlyJpeg: false,
      allowSkip: true,
    };
    assert.equal(
      shouldSkipReencodeForFile({
        ...checkIn,
        mime: "image/png",
        byteSize: 700_000,
        longEdge: 1600,
      }),
      true,
    );
    assert.equal(
      shouldSkipReencodeForFile({
        ...checkIn,
        mime: "image/jpeg",
        byteSize: 200_000,
        longEdge: 1599,
      }),
      true,
    );
    assert.equal(
      shouldSkipReencodeForFile({
        ...checkIn,
        mime: "image/jpeg",
        byteSize: 200_000,
        longEdge: 1601,
      }),
      false,
    );
    assert.equal(
      shouldSkipReencodeForFile({
        ...checkIn,
        mime: "image/jpeg",
        byteSize: 700_001,
        longEdge: 1200,
      }),
      false,
    );
  });

  it("does not skip when dimensions are unknown, the file is empty, or skip is disabled", () => {
    assert.equal(
      shouldSkipReencodeForFile({
        mime: "image/jpeg",
        byteSize: 100_000,
        longEdge: null,
        maxEdge: 1600,
        skipUnderBytes: 700_000,
        skipOnlyJpeg: false,
        allowSkip: true,
      }),
      false,
    );
    assert.equal(
      shouldSkipReencodeForFile({
        mime: "image/jpeg",
        byteSize: 100_000,
        longEdge: 0,
        maxEdge: 1600,
        skipUnderBytes: 700_000,
        skipOnlyJpeg: false,
        allowSkip: true,
      }),
      false,
    );
    assert.equal(
      shouldSkipReencodeForFile({
        mime: "image/jpeg",
        byteSize: 100_000,
        longEdge: 800,
        maxEdge: 1600,
        skipUnderBytes: 700_000,
        skipOnlyJpeg: false,
        allowSkip: false,
      }),
      false,
    );
  });
});

describe("scaledPhotoDimensions", () => {
  it("never upscales an image already within the cap", () => {
    assert.deepEqual(scaledPhotoDimensions(800, 600, 1600), { width: 800, height: 600 });
    assert.deepEqual(scaledPhotoDimensions(1600, 900, 1600), { width: 1600, height: 900 });
    assert.deepEqual(scaledPhotoDimensions(900, 1600, 1600), { width: 900, height: 1600 });
  });

  it("caps the long edge at 1600 without changing aspect ratio", () => {
    assert.deepEqual(scaledPhotoDimensions(4000, 3000, 1600), { width: 1600, height: 1200 });
    assert.deepEqual(scaledPhotoDimensions(3000, 4000, 1600), { width: 1200, height: 1600 });
    assert.deepEqual(scaledPhotoDimensions(2048, 2048, 1600), { width: 1600, height: 1600 });
    assert.deepEqual(scaledPhotoDimensions(100, 4000, 1600), { width: 40, height: 1600 });
  });
});

describe("fileAfterCompressionFallback", () => {
  it("keeps a larger encode when fallback is off (onboarding)", () => {
    const original = fileOf("face.jpg", "image/jpeg", 100);
    const compressed = fileOf("face.jpg", "image/jpeg", 150);
    assert.equal(fileAfterCompressionFallback(original, compressed, false), compressed);
  });

  it("falls back to the original only when the encode is strictly larger", () => {
    const original = fileOf("face.jpg", "image/jpeg", 100);
    const bigger = fileOf("face.jpg", "image/jpeg", 101);
    const equal = fileOf("face.jpg", "image/jpeg", 100);
    const smaller = fileOf("face.jpg", "image/jpeg", 99);
    assert.equal(fileAfterCompressionFallback(original, bigger, true), original);
    assert.equal(fileAfterCompressionFallback(original, equal, true), equal);
    assert.equal(fileAfterCompressionFallback(original, smaller, true), smaller);
  });
});
