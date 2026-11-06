import { zoomAt, type Camera } from "@/lib/mascot/game/walk";

export type PinchSample = { dist: number; x: number; y: number };

/**
 * Zoom around the pinch midpoint, then follow the fingers if they slide.
 * Scale stays inside the walk module's min and max. The walker is not touched.
 */
export function applyPinch(
  camera: Camera,
  previous: PinchSample,
  next: PinchSample,
  focusX: number,
  focusY: number,
): Camera {
  const factor = next.dist / (previous.dist || 1);
  const zoomed = zoomAt(camera, factor, focusX, focusY);
  return {
    scale: zoomed.scale,
    x: zoomed.x + (next.x - previous.x),
    y: zoomed.y + (next.y - previous.y),
  };
}

/** Trackpad and mouse wheel. Positive deltaY zooms out. */
export function wheelZoomFactor(deltaY: number): number {
  const delta = Number.isFinite(deltaY) ? deltaY : 0;
  return Math.exp(-delta * 0.0016);
}
