import { clampCamera, zoomAt, type Camera } from "@/lib/mascot/game/walk";

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

/** Slide the camera and keep it inside the lobby frame. The walker is not touched. */
export function panCamera(
  camera: Camera,
  dx: number,
  dy: number,
  viewW: number,
  viewH: number,
  worldW: number,
  worldH: number,
): Camera {
  return clampCamera(
    { x: camera.x + dx, y: camera.y + dy, scale: camera.scale },
    viewW,
    viewH,
    worldW,
    worldH,
  );
}

/**
 * Ease scale toward `desired` while the world point under the focus stays put.
 * A full step (reduced motion, or close enough) lands on `desired`.
 */
export function easeZoom(
  shown: Camera,
  desired: Camera,
  focusX: number,
  focusY: number,
  dt: number,
  reduced = false,
): Camera {
  const safeDt = Math.min(0.05, Math.max(0, dt));
  const t = reduced ? 1 : 1 - Math.exp(-16 * safeDt);
  if (t >= 0.999) return desired;
  const scale = shown.scale + (desired.scale - shown.scale) * t;
  if (Math.abs(scale - desired.scale) < 0.0008) return desired;
  const wx = (focusX - desired.x) / (desired.scale || 1);
  const wy = (focusY - desired.y) / (desired.scale || 1);
  return { scale, x: focusX - wx * scale, y: focusY - wy * scale };
}

/** Trackpad and mouse wheel. Positive deltaY zooms out. */
export function wheelZoomFactor(deltaY: number): number {
  const delta = Number.isFinite(deltaY) ? deltaY : 0;
  return Math.exp(-delta * 0.0016);
}
