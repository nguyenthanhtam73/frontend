/** Mid-range phones stay sharp without a 3× or 4× framebuffer. */
export const MAX_DPR = 2;

export function cappedDpr(dpr: number): number {
  if (!Number.isFinite(dpr) || dpr <= 0) return 1;
  return Math.min(MAX_DPR, dpr);
}
