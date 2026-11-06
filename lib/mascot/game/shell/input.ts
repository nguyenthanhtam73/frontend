import type { Point } from "@/lib/mascot/game/walk";

export const DRAG_PX = 10;

export function pointerKind(distancePx: number): "tap" | "drag" {
  return distancePx > DRAG_PX ? "drag" : "tap";
}

/** Arrow keys walk one short step. Other keys are ignored. */
export function arrowGoal(from: Point, key: string, step = 0.06): Point | null {
  if (key === "ArrowLeft") return { x: from.x - step, y: from.y };
  if (key === "ArrowRight") return { x: from.x + step, y: from.y };
  if (key === "ArrowUp") return { x: from.x, y: from.y - step };
  if (key === "ArrowDown") return { x: from.x, y: from.y + step };
  return null;
}
