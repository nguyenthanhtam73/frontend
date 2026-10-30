/**
 * Client-side focus measure for check-in photos.
 *
 * Variance of the Laplacian (Pech-Pacheco) on a small grayscale sample.
 * The sample is the photo after it has been downscaled to
 * {@link PHOTO_BLUR_ANALYSIS_MAX_EDGE} — do not compare this score to a
 * full-resolution OpenCV threshold.
 *
 * The decision uses the contrast-normalized score (`rawVariance / grayVariance`),
 * which is the Laplacian variance of pixels scaled to unit standard deviation.
 * A dim sharp photo and a bright sharp photo then land on the same scale, so a
 * dark-but-sharp selfie is not treated as blur. Near-blank frames (std below
 * {@link PHOTO_BLUR_MIN_CONTRAST_STD}) return null: we cannot tell, and the
 * caller continues without a warning.
 *
 * Only the center {@link PHOTO_BLUR_CENTER_FRACTION} of the sample is scored.
 * Corner walls dilute a sharp face; whole-frame camera shake still shows up
 * in the center.
 */

/** Long-edge cap of the canvas sample. Kept small so low-end Android stays responsive. */
export const PHOTO_BLUR_ANALYSIS_MAX_EDGE = 320;

/**
 * Refuse to scan anything larger than the downscaled sample. A full camera
 * frame on the main thread would hitch; the caller must downscale first and
 * otherwise skip the warning.
 */
export const PHOTO_BLUR_MAX_SAMPLE_PIXELS = 250_000;

/** Crop shorter than this has no stable Laplacian. Caller skips the warning. */
export const PHOTO_BLUR_MIN_EDGE = 32;

/**
 * Gray standard deviation (0–255) below which the frame is too flat to call
 * blur. Blank or unreadably dark samples skip the warning.
 */
export const PHOTO_BLUR_MIN_CONTRAST_STD = 4;

/** Fraction of width and height kept, centered. */
export const PHOTO_BLUR_CENTER_FRACTION = 0.8;

/**
 * Blurry when the contrast-normalized Laplacian variance is strictly below this.
 *
 * Calibrated on synthetic face-like frames at analysis resolution (see
 * `photo-sharpness.test.ts`):
 *
 * Calibrated on a face-like frame (eyes, hairline, lips, skin) generated large
 * and box-downsampled onto this sample — the same order as the client canvas.
 * See `photo-sharpness.test.ts` for the fixtures.
 *
 * | Sample (after downsample to ~320px long edge) | Score | Warn? |
 * | --- | --- | --- |
 * | In-focus face, including a dim copy | ~0.15–0.19 | no |
 * | Horizontal camera shake, then downsample | ~0.09 | yes |
 * | Defocus, then downsample | ~0.03 and below | yes |
 *
 * 0.12 sits in that gap. The check is allowed to miss borderline softness;
 * a false warning is dismissible (“send anyway”). If production scores for
 * photos people kept show the cut is too eager, lower this number.
 */
export const PHOTO_BLUR_SCORE_THRESHOLD = 0.12;

export type PhotoSharpness = {
  /**
   * Contrast-normalized variance of the Laplacian. Higher means sharper.
   * This is the value compared to {@link PHOTO_BLUR_SCORE_THRESHOLD}.
   */
  score: number;
  /** Population variance of the Laplacian on 0–255 gray, before normalization. */
  rawVariance: number;
  blurry: boolean;
};

export function isBlurrySharpnessScore(score: number): boolean {
  return Number.isFinite(score) && score < PHOTO_BLUR_SCORE_THRESHOLD;
}

function centerCrop(
  width: number,
  height: number,
): { x: number; y: number; width: number; height: number } | null {
  const cropW = Math.round(width * PHOTO_BLUR_CENTER_FRACTION);
  const cropH = Math.round(height * PHOTO_BLUR_CENTER_FRACTION);
  if (cropW < PHOTO_BLUR_MIN_EDGE || cropH < PHOTO_BLUR_MIN_EDGE) return null;
  return {
    x: Math.floor((width - cropW) / 2),
    y: Math.floor((height - cropH) / 2),
    width: cropW,
    height: cropH,
  };
}

/**
 * Score an RGBA sample. Returns null when the sample is too small, too large
 * to scan safely, or too flat to judge. Null means “do not warn”.
 */
export function scorePhotoSharpness(
  rgba: ArrayLike<number>,
  width: number,
  height: number,
): PhotoSharpness | null {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  const w = Math.floor(width);
  const h = Math.floor(height);
  if (w < 3 || h < 3) return null;
  if (w * h > PHOTO_BLUR_MAX_SAMPLE_PIXELS) return null;
  if (rgba.length < w * h * 4) return null;

  const crop = centerCrop(w, h);
  if (!crop) return null;

  const gray = new Float32Array(crop.width * crop.height);
  let sum = 0;
  let sumSq = 0;
  for (let y = 0; y < crop.height; y++) {
    const srcY = crop.y + y;
    for (let x = 0; x < crop.width; x++) {
      const src = (srcY * w + (crop.x + x)) * 4;
      const value =
        0.299 * (rgba[src] ?? 0) +
        0.587 * (rgba[src + 1] ?? 0) +
        0.114 * (rgba[src + 2] ?? 0);
      const i = y * crop.width + x;
      gray[i] = value;
      sum += value;
      sumSq += value * value;
    }
  }

  const n = gray.length;
  const mean = sum / n;
  const grayVariance = Math.max(0, sumSq / n - mean * mean);
  const std = Math.sqrt(grayVariance);
  if (std < PHOTO_BLUR_MIN_CONTRAST_STD) return null;

  const innerW = crop.width - 2;
  const innerH = crop.height - 2;
  const m = innerW * innerH;
  if (m <= 0) return null;

  const invStd = 1 / std;
  let lapSum = 0;
  let lapSumSq = 0;
  let rawSum = 0;
  let rawSumSq = 0;
  for (let y = 1; y < crop.height - 1; y++) {
    for (let x = 1; x < crop.width - 1; x++) {
      const i = y * crop.width + x;
      const raw =
        gray[i - crop.width]! +
        gray[i - 1]! +
        gray[i + 1]! +
        gray[i + crop.width]! -
        4 * gray[i]!;
      rawSum += raw;
      rawSumSq += raw * raw;
      const lap = raw * invStd;
      lapSum += lap;
      lapSumSq += lap * lap;
    }
  }

  const rawMean = rawSum / m;
  const rawVariance = Math.max(0, rawSumSq / m - rawMean * rawMean);
  const lapMean = lapSum / m;
  const score = Math.max(0, lapSumSq / m - lapMean * lapMean);
  if (!Number.isFinite(score)) return null;

  return {
    score,
    rawVariance,
    blurry: isBlurrySharpnessScore(score),
  };
}
