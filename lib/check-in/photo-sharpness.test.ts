import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  PHOTO_BLUR_CENTER_FRACTION,
  PHOTO_BLUR_MAX_SAMPLE_PIXELS,
  PHOTO_BLUR_SCORE_THRESHOLD,
  isBlurrySharpnessScore,
  scorePhotoSharpness,
  type PhotoSharpness,
} from "./photo-sharpness";

function mulberry(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s & 0xffff) / 0xffff;
  };
}

/** Face-like gray frame: hairline, eyes, lips, and a little skin texture. */
function faceGray(w: number, h: number, amp = 16, seed = 7): Float64Array {
  const rand = mulberry(seed);
  const g = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const nx = x / w;
      const ny = y / h;
      let v = 188 + 18 * Math.sin(ny * Math.PI) - 12 * nx;
      if (ny < 0.18) v = 32;
      if (
        ny > 0.3 &&
        ny < 0.345 &&
        ((nx > 0.22 && nx < 0.42) || (nx > 0.58 && nx < 0.78))
      ) {
        v = 40;
      }
      const paintEye = (cx: number) => {
        const dx = (nx - cx) * w;
        const dy = (ny - 0.42) * h;
        const d2 = dx * dx + dy * dy;
        if (d2 < (w * 0.045) ** 2) v = 245;
        if (d2 < (w * 0.025) ** 2) v = 25;
      };
      paintEye(0.33);
      paintEye(0.67);
      if (nx > 0.46 && nx < 0.54 && ny > 0.46 && ny < 0.62) v -= 28;
      if (ny > 0.7 && ny < 0.76 && nx > 0.38 && nx < 0.62) v = 110;
      if (nx < 0.06 || nx > 0.94) v = 210;
      v += (rand() - 0.5) * amp;
      g[y * w + x] = Math.max(0, Math.min(255, v));
    }
  }
  return g;
}

function gaussianKernel(sigma: number): Float64Array {
  const radius = Math.max(1, Math.ceil(sigma * 3));
  const kernel = new Float64Array(radius * 2 + 1);
  let sum = 0;
  for (let i = -radius; i <= radius; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    kernel[i + radius] = v;
    sum += v;
  }
  for (let i = 0; i < kernel.length; i++) kernel[i] = kernel[i]! / sum;
  return kernel;
}

function blurGray(src: Float64Array, w: number, h: number, sigma: number): Float64Array {
  const k = gaussianKernel(sigma);
  const r = (k.length - 1) / 2;
  const tmp = new Float64Array(w * h);
  const out = new Float64Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) {
        const xx = Math.min(w - 1, Math.max(0, x + i));
        acc += src[y * w + xx]! * k[i + r]!;
      }
      tmp[y * w + x] = acc;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) {
        const yy = Math.min(h - 1, Math.max(0, y + i));
        acc += tmp[yy * w + x]! * k[i + r]!;
      }
      out[y * w + x] = acc;
    }
  }
  return out;
}

function boxBlurX(src: Float64Array, w: number, h: number, radius: number): Float64Array {
  const out = new Float64Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      let n = 0;
      for (let i = -radius; i <= radius; i++) {
        acc += src[y * w + Math.min(w - 1, Math.max(0, x + i))]!;
        n += 1;
      }
      out[y * w + x] = acc / n;
    }
  }
  return out;
}

/** Integer box downsample, standing in for the client canvas drawImage. */
function downsample(src: Float64Array, w: number, h: number, factor: number) {
  const nw = Math.floor(w / factor);
  const nh = Math.floor(h / factor);
  const out = new Float64Array(nw * nh);
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      let acc = 0;
      let n = 0;
      for (let dy = 0; dy < factor; dy++) {
        for (let dx = 0; dx < factor; dx++) {
          acc += src[(y * factor + dy) * w + (x * factor + dx)]!;
          n += 1;
        }
      }
      out[y * nw + x] = acc / n;
    }
  }
  return { gray: out, w: nw, h: nh };
}

function scaleContrast(src: Float64Array, factor: number): Float64Array {
  let sum = 0;
  for (const v of src) sum += v;
  const mean = sum / src.length;
  const out = new Float64Array(src.length);
  for (let i = 0; i < src.length; i++) {
    out[i] = Math.max(0, Math.min(255, mean + (src[i]! - mean) * factor));
  }
  return out;
}

function grayToRgba(gray: Float64Array): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(gray.length * 4);
  for (let i = 0; i < gray.length; i++) {
    const v = Math.max(0, Math.min(255, Math.round(gray[i]!)));
    rgba[i * 4] = v;
    rgba[i * 4 + 1] = v;
    rgba[i * 4 + 2] = v;
    rgba[i * 4 + 3] = 255;
  }
  return rgba;
}

function scoreGray(gray: Float64Array, w: number, h: number): PhotoSharpness | null {
  return scorePhotoSharpness(grayToRgba(gray), w, h);
}

describe("photo sharpness threshold", () => {
  const hiW = 480;
  const hiH = 640;
  const sharpHi = faceGray(hiW, hiH, 8, 13);
  const sharpSample = downsample(sharpHi, hiW, hiH, 2);
  const shakyHi = boxBlurX(blurGray(sharpHi, hiW, hiH, 2.4), hiW, hiH, 6);
  const shakySample = downsample(shakyHi, hiW, hiH, 2);
  const motionSample = downsample(boxBlurX(sharpHi, hiW, hiH, 6), hiW, hiH, 2);

  it("locks the cut at 0.12, between a downsampled sharp face and a shaky one", () => {
    assert.equal(PHOTO_BLUR_SCORE_THRESHOLD, 0.12);
    const sharp = scoreGray(sharpSample.gray, sharpSample.w, sharpSample.h);
    const shaky = scoreGray(shakySample.gray, shakySample.w, shakySample.h);
    const motion = scoreGray(motionSample.gray, motionSample.w, motionSample.h);
    assert.ok(sharp, "sharp sample should be measurable");
    assert.ok(shaky, "shaky sample should be measurable");
    assert.ok(motion, "motion sample should be measurable");
    assert.equal(sharp.blurry, false, `sharp score ${sharp.score}`);
    assert.ok(sharp.score > 0.14, `sharp score ${sharp.score}`);
    assert.equal(shaky.blurry, true, `shaky score ${shaky.score}`);
    assert.ok(shaky.score < 0.05, `shaky score ${shaky.score}`);
    assert.equal(motion.blurry, true, `motion score ${motion.score}`);
    assert.ok(sharp.score > motion.score, "sharp should outscore camera shake");
  });

  it("does not treat a dim sharp face as blurry", () => {
    const dim = scoreGray(scaleContrast(sharpSample.gray, 0.3), sharpSample.w, sharpSample.h);
    const sharp = scoreGray(sharpSample.gray, sharpSample.w, sharpSample.h);
    assert.ok(dim && sharp);
    assert.equal(dim.blurry, false, `dim score ${dim.score}`);
    const ratio = dim.score / sharp.score;
    assert.ok(ratio > 0.85 && ratio < 1.15, `dim/sharp ${ratio}`);
  });

  it("treats a score below the cut as blurry and the cut itself as sharp enough", () => {
    assert.equal(isBlurrySharpnessScore(PHOTO_BLUR_SCORE_THRESHOLD), false);
    assert.equal(isBlurrySharpnessScore(PHOTO_BLUR_SCORE_THRESHOLD - 0.001), true);
    assert.equal(isBlurrySharpnessScore(Number.NaN), false);
  });
});

describe("scorePhotoSharpness guards", () => {
  it("skips blank, tiny, and oversized samples instead of warning", () => {
    const flat = new Uint8ClampedArray(80 * 80 * 4).fill(140);
    assert.equal(scorePhotoSharpness(flat, 80, 80), null);
    assert.equal(scorePhotoSharpness(new Uint8ClampedArray(8 * 8 * 4), 8, 8), null);
    assert.equal(
      scorePhotoSharpness(new Uint8ClampedArray(0), 2_000, 2_000),
      null,
    );
    assert.ok(2_000 * 2_000 > PHOTO_BLUR_MAX_SAMPLE_PIXELS);
  });

  it("scores a checker as sharp and ignores a sharp border around a smooth center", () => {
    const w = 80;
    const h = 80;
    const checker = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const v = (x + y) % 2 === 0 ? 10 : 240;
        const i = (y * w + x) * 4;
        checker[i] = v;
        checker[i + 1] = v;
        checker[i + 2] = v;
        checker[i + 3] = 255;
      }
    }
    const sharp = scorePhotoSharpness(checker, w, h);
    assert.ok(sharp);
    assert.equal(sharp.blurry, false);

    const smoothCenter = new Uint8ClampedArray(checker);
    const crop = Math.round(w * PHOTO_BLUR_CENTER_FRACTION);
    const origin = Math.floor((w - crop) / 2);
    for (let y = origin; y < origin + crop; y++) {
      for (let x = origin; x < origin + crop; x++) {
        const v = 40 + y;
        const i = (y * w + x) * 4;
        smoothCenter[i] = v;
        smoothCenter[i + 1] = v;
        smoothCenter[i + 2] = v;
      }
    }
    const cropped = scorePhotoSharpness(smoothCenter, w, h);
    assert.ok(cropped, "smooth center still has contrast");
    assert.equal(cropped.blurry, true, `center score ${cropped.score}`);
  });

  it("scores a 320px sample quickly enough for a low-end phone", () => {
    const w = 240;
    const h = 320;
    const rgba = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      const v = (i * 17) % 255;
      rgba[i * 4] = v;
      rgba[i * 4 + 1] = v;
      rgba[i * 4 + 2] = v;
      rgba[i * 4 + 3] = 255;
    }
    const started = performance.now();
    const scored = scorePhotoSharpness(rgba, w, h);
    const elapsed = performance.now() - started;
    assert.ok(scored);
    assert.ok(elapsed < 80, `scoring took ${elapsed.toFixed(1)}ms`);
  });
});
