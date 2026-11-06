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

/** Arrow keys walk one short step. Other keys are ignored. */
export function arrowGoal(from: Point, key: string, step = 0.06): Point | null {
  if (key === "ArrowLeft") return { x: from.x - step, y: from.y };
  if (key === "ArrowRight") return { x: from.x + step, y: from.y };
  if (key === "ArrowUp") return { x: from.x, y: from.y - step };
  if (key === "ArrowDown") return { x: from.x, y: from.y + step };
  return null;
}
