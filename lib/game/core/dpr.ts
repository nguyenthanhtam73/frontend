/** Mid-range phones stay sharp without a 3× or 4× framebuffer. */
export const MAX_DPR = 2;

/** iPad-class short side. A 2× buffer of that screen is too much fill. */
export const LARGE_SCREEN_SHORT_SIDE = 768;

/** Cap used when the CSS viewport is iPad-sized. */
export const LARGE_SCREEN_MAX_DPR = 1.5;

export function cappedDpr(dpr: number): number {
  if (!Number.isFinite(dpr) || dpr <= 0) return 1;
  return Math.min(MAX_DPR, dpr);
}

/** Phones stay at the DPR cap of 2. Large screens, including iPad, stay at 1.5. */
export function rendererResolution(dpr: number, viewW: number, viewH: number): number {
  const capped = cappedDpr(dpr);
  const width = Number.isFinite(viewW) ? viewW : 0;
  const height = Number.isFinite(viewH) ? viewH : 0;
  if (Math.min(width, height) >= LARGE_SCREEN_SHORT_SIDE) return Math.min(capped, LARGE_SCREEN_MAX_DPR);
  return capped;
}
