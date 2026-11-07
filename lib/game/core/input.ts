import type { Point } from "@/lib/mascot/game/walk";

/**
 * Touch and mouse both arrive as pointer events. A slide walks.
 * A short press is a tap. Nothing in here is hover-only.
 */
export const DRAG_PX = 10;

export function pointerKind(distancePx: number): "tap" | "drag" {
  return distancePx > DRAG_PX ? "drag" : "tap";
}

/** Two fingers are always a pinch, so they never also walk the character. */
export function pointerGesture(pointerCount: number, distancePx: number): "pinch" | "drag" | "tap" {
  if (pointerCount >= 2) return "pinch";
  return pointerKind(distancePx);
}

/** A tap is a short press. Anything longer is not a walk. */
export const TAP_MS = 250;

/**
 * One finger can move a little before the other lands. Pan does not start
 * until this has passed, so that head start is not a camera shove.
 */
export const PAN_ARM_MS = 120;

/**
 * Pinch wins over everything. A one-finger slide becomes a pan only after
 * PAN_ARM_MS. A short press under DRAG_PX and TAP_MS is a walk.
 */
export function gestureKind(
  elapsedMs: number,
  distancePx: number,
  pointerCount: number,
): "pinch" | "pan" | "tap" | "hold" {
  if (pointerCount >= 2) return "pinch";
  if (pointerCount !== 1) return "hold";
  if (distancePx >= DRAG_PX && elapsedMs >= PAN_ARM_MS) return "pan";
  if (distancePx < DRAG_PX && elapsedMs <= TAP_MS) return "tap";
  return "hold";
}

/** A new tap picks a destination. Panning or zooming the map leaves the walk alone. */
export function walkTargetChanges(gesture: "tap" | "pan" | "pinch" | "wheel" | "hold"): boolean {
  return gesture === "tap";
}

/** Arrow keys walk one short step. Other keys are ignored. */
export function arrowGoal(from: Point, key: string, step = 0.06): Point | null {
  if (key === "ArrowLeft") return { x: from.x - step, y: from.y };
  if (key === "ArrowRight") return { x: from.x + step, y: from.y };
  if (key === "ArrowUp") return { x: from.x, y: from.y - step };
  if (key === "ArrowDown") return { x: from.x, y: from.y + step };
  return null;
}
