import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  PHOTO_BLUR_RESIZE_MIN_BYTES,
  blurDecodeOptions,
  measurePhotoBlur,
} from "./measure-photo-blur";
import { PHOTO_BLUR_ANALYSIS_MAX_EDGE } from "./photo-sharpness";

type CanvasStub = {
  width: number;
  height: number;
  getContext: () => {
    drawImage: () => void;
    getImageData: (x: number, y: number, w: number, h: number) => {
      data: Uint8ClampedArray;
      width: number;
      height: number;
    };
  } | null;
};

function installDocument(opts?: {
  imageData?: (w: number, h: number) => Uint8ClampedArray;
  context?: CanvasStub["getContext"] | null;
}) {
  const canvas: CanvasStub = {
    width: 0,
    height: 0,
    getContext: opts?.context ?? (() => ({
      drawImage() {},
      getImageData(_x: number, _y: number, w: number, h: number) {
        const data = opts?.imageData
          ? opts.imageData(w, h)
          : new Uint8ClampedArray(w * h * 4).fill(128);
        return { data, width: w, height: h };
      },
    })),
  };
  Object.assign(globalThis, {
    document: {
      createElement() {
        return canvas;
      },
    },
  });
  return canvas;
}

function checker(w: number, h: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const v = (x + y) % 2 === 0 ? 0 : 255;
      const i = (y * w + x) * 4;
      data[i] = v;
      data[i + 1] = v;
      data[i + 2] = v;
      data[i + 3] = 255;
    }
  }
  return data;
}

describe("measurePhotoBlur", () => {
  const originalDocument = globalThis.document;
  const originalBitmap = globalThis.createImageBitmap;

  afterEach(() => {
    Object.assign(globalThis, {
      document: originalDocument,
      createImageBitmap: originalBitmap,
    });
  });

  it("asks large camera files to decode already downscaled", () => {
    const small = blurDecodeOptions(10_000);
    assert.equal(small.resizeWidth, undefined);
    assert.equal(small.imageOrientation, "from-image");
    const large = blurDecodeOptions(PHOTO_BLUR_RESIZE_MIN_BYTES);
    assert.equal(large.resizeWidth, PHOTO_BLUR_ANALYSIS_MAX_EDGE);
    assert.equal(large.resizeQuality, "low");
  });

  it("returns null without throwing when the document or the file is missing", async () => {
    Object.assign(globalThis, { document: undefined });
    const blob = new Blob([new Uint8Array(32)]);
    assert.equal(await measurePhotoBlur(blob), null);
    installDocument();
    assert.equal(await measurePhotoBlur(new Blob([])), null);
  });

  it("returns null when decode throws", async () => {
    installDocument();
    globalThis.createImageBitmap = (async () => {
      throw new Error("decode failed");
    }) as typeof createImageBitmap;
    assert.equal(await measurePhotoBlur(new Blob([new Uint8Array(64)])), null);
  });

  it("returns null when the sample does not finish in time", async () => {
    installDocument();
    globalThis.createImageBitmap = (() => new Promise(() => {})) as typeof createImageBitmap;
    const result = await measurePhotoBlur(new Blob([new Uint8Array(64)]), 20);
    assert.equal(result, null);
  });

  it("scores a decoded sample and passes resize options for a large file", async () => {
    installDocument({ imageData: checker });
    let seen: ImageBitmapOptions | undefined;
    globalThis.createImageBitmap = (async (_file: Blob, options?: ImageBitmapOptions) => {
      seen = options;
      return {
        width: 64,
        height: 64,
        close() {},
      };
    }) as typeof createImageBitmap;

    const sharp = await measurePhotoBlur(new Blob([new Uint8Array(64)]));
    assert.ok(sharp);
    assert.equal(sharp.blurry, false);
    assert.equal(seen?.resizeWidth, undefined);

    const bytes = new Uint8Array(PHOTO_BLUR_RESIZE_MIN_BYTES + 10);
    const again = await measurePhotoBlur(new Blob([bytes]));
    assert.ok(again);
    assert.equal(again.blurry, false);
    assert.equal(seen?.resizeWidth, PHOTO_BLUR_ANALYSIS_MAX_EDGE);
  });

  it("returns null when the canvas context is unavailable", async () => {
    installDocument({
      context: () => null,
    });
    globalThis.createImageBitmap = (async () => ({
      width: 64,
      height: 64,
      close() {},
    })) as typeof createImageBitmap;
    assert.equal(await measurePhotoBlur(new Blob([new Uint8Array(64)])), null);
  });
});
