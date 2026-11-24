/**
 * Personal-room floor. White on `walk-mask.png` is where her feet may stand.
 * The picture matches `ROOM_BLOCKS`: wall and window above the planks, the
 * nav along the bottom, and pads in front of the bed, closet, plant, and sink.
 * `v` is the shared art generation. `h` is this file's sha256 prefix so a
 * mask edit still busts without waiting for the next generation bump.
 */

import { mascotAssetUrl } from "@/lib/mascot/asset-url";
import { findRoute, gridFromMask, gridSize, isWalkable, nearestWalkable, segmentStaysWalkable, type WalkGrid, type WalkPoint } from "@/lib/mascot/game/lobby-walk";
import { clamp } from "@/lib/mascot/game/walk";

export const ROOM_WALK_MASK = mascotAssetUrl("/mascot/room/walk-mask.png?v=34a92b8496");
export const ROOM_MASK_PX = 256;
/** Logical room used only to size the path grid (~20px cells). */
export const ROOM_WORLD = 1000;

/**
 * Feet stay on the planks. The floor painting starts at 58% and the nav
 * covers the bottom strip, so y runs from just in front of the baseboard
 * to a step above the nav. x keeps her body on a 390px phone and an iPad.
 */
export const ROOM_BOUNDS = { minX: 0.14, maxX: 0.88, minY: 0.64, maxY: 0.82 } as const;

/** Feet at or above this line are behind the furniture (the props paint over her). */
export const ROOM_BEHIND_Y = 0.66;

/** Furniture shares this z-index. Her sort index crosses it as she walks down. */
export const ROOM_PROP_Z = 42;

export const ROOM_SPAWN: WalkPoint = { x: 0.5, y: 0.72 };

/**
 * Normalized blocks, half-open. The wall is everything above the planks.
 * Furniture rects are the bed, wardrobe, plant, and sink footprints, with a
 * short pad of floor in front so she stops at the edge instead of standing
 * on them. The strip beside the sink stays open so she can walk behind it.
 */
export const ROOM_BLOCKS: readonly { x0: number; y0: number; x1: number; y1: number; name: string }[] = [
  { name: "wall", x0: 0, y0: 0, x1: 1, y1: 0.64 },
  { name: "nav", x0: 0, y0: 0.83, x1: 1, y1: 1 },
  { name: "left", x0: 0, y0: 0, x1: 0.14, y1: 1 },
  { name: "right", x0: 0.88, y0: 0, x1: 1, y1: 1 },
  { name: "bed", x0: 0, y0: 0.56, x1: 0.28, y1: 0.68 },
  // The wardrobe art ends near x=0.35. The extra pad used to reach 0.40, which
  // met the name-label block on a 360px phone and sealed the floor beside the pad.
  { name: "closet", x0: 0.2, y0: 0.56, x1: 0.36, y1: 0.68 },
  { name: "plant", x0: 0.55, y0: 0.56, x1: 0.72, y1: 0.66 },
  { name: "sink", x0: 0.8, y0: 0.56, x1: 1, y1: 0.67 },
];

/** Mark cells whose centers sit inside a normalized rectangle. */
export function blockRoomRect(
  grid: WalkGrid,
  rect: { x0: number; y0: number; x1: number; y1: number },
): void {
  for (let r = 0; r < grid.rows; r += 1) {
    for (let c = 0; c < grid.cols; c += 1) {
      const x = (c + 0.5) / grid.cols;
      const y = (r + 0.5) / grid.rows;
      if (x >= rect.x0 && x < rect.x1 && y >= rect.y0 && y < rect.y1) grid.walk[r * grid.cols + c] = 0;
    }
  }
}

export function roomBlocked(x: number, y: number): boolean {
  for (const block of ROOM_BLOCKS) {
    if (x >= block.x0 && x < block.x1 && y >= block.y0 && y < block.y1) return true;
  }
  return false;
}

export function roomBlockName(x: number, y: number): string | null {
  for (const block of ROOM_BLOCKS) {
    if (x >= block.x0 && x < block.x1 && y >= block.y0 && y < block.y1) return block.name;
  }
  return null;
}

/** Gray mask, 0 = blocked, 255 = floor. Pixel centers use the same test as the PNG. */
export function paintRoomMask(width = ROOM_MASK_PX, height = ROOM_MASK_PX): Uint8Array {
  const pixels = new Uint8Array(width * height);
  for (let y = 0; y < height; y += 1) {
    const ny = (y + 0.5) / height;
    for (let x = 0; x < width; x += 1) {
      const nx = (x + 0.5) / width;
      pixels[y * width + x] = roomBlocked(nx, ny) ? 0 : 255;
    }
  }
  return pixels;
}

export function roomWalkGrid(pixels?: Uint8Array, width = ROOM_MASK_PX, height = ROOM_MASK_PX): WalkGrid {
  const mask = pixels ?? paintRoomMask(width, height);
  const size = gridSize(ROOM_WORLD, ROOM_WORLD);
  return gridFromMask(mask, width, height, size.cols, size.rows, 1);
}

/**
 * The furthest point on the segment that stays on the floor.
 * A blocked step returns the last open point, never a jump to another cell.
 */
export function roomStepTo(grid: WalkGrid, from: WalkPoint, to: WalkPoint): WalkPoint {
  if (isWalkable(grid, to.x, to.y) && segmentStaysWalkable(grid, from, to)) return to;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 8; i += 1) {
    const mid = (lo + hi) / 2;
    const point = { x: from.x + (to.x - from.x) * mid, y: from.y + (to.y - from.y) * mid };
    if (isWalkable(grid, point.x, point.y) && segmentStaysWalkable(grid, from, point)) lo = mid;
    else hi = mid;
  }
  if (lo <= 0) return from;
  return { x: from.x + (to.x - from.x) * lo, y: from.y + (to.y - from.y) * lo };
}

/** Tap anywhere. Furniture and the wall become the nearest open floor cell. */
export function roomRoute(grid: WalkGrid, from: WalkPoint, to: WalkPoint): WalkPoint[] {
  const route = findRoute(grid, from, nearestWalkable(grid, to.x, to.y));
  const safe: WalkPoint[] = [];
  let prev = from;
  for (const point of route) {
    if (!isWalkable(grid, point.x, point.y) || !segmentStaysWalkable(grid, prev, point)) break;
    safe.push(point);
    prev = point;
  }
  return safe;
}

export type RoomDir = "up" | "down" | "left" | "right";

const ROOM_DIR: Record<RoomDir, WalkPoint> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

/** One step on the pad. Null when the next cells are furniture, wall, or nav. */
export function roomNudge(grid: WalkGrid, from: WalkPoint, dir: RoomDir): WalkPoint | null {
  const delta = ROOM_DIR[dir];
  for (const step of [0.06, 0.035, 0.02]) {
    const next = { x: from.x + delta.x * step, y: from.y + delta.y * step };
    if (next.x <= 0 || next.y <= 0 || next.x >= 1 || next.y >= 1) continue;
    if (!isWalkable(grid, next.x, next.y)) continue;
    if (!segmentStaysWalkable(grid, from, next)) continue;
    return next;
  }
  return null;
}

/** Lower on the screen (larger y) draws a little larger. Same idea as the lobby. */
export function roomDepthScale(y: number): number {
  const span = ROOM_BOUNDS.maxY - ROOM_BOUNDS.minY;
  const t = clamp((y - ROOM_BOUNDS.minY) / span, 0, 1);
  return 0.9 + t * 0.18;
}

/**
 * Floor stacking. Behind the props at the back of the room, in front of them
 * when she walks down. Stays under the task card (60) and the nav (80).
 */
export function roomSortIndex(y: number): number {
  return y < ROOM_BEHIND_Y ? 30 : 55;
}

/** A short stroll while she has been still. Null when the roll stays on furniture. */
export function roomWanderGoal(grid: WalkGrid, from: WalkPoint, random: () => number = Math.random): WalkPoint | null {
  for (let i = 0; i < 8; i += 1) {
    const x = from.x + (random() - 0.5) * 0.22;
    const y = from.y + (random() - 0.5) * 0.1;
    if (x <= 0 || y <= 0 || x >= 1 || y >= 1) continue;
    if (!isWalkable(grid, x, y)) continue;
    if (Math.hypot(x - from.x, y - from.y) < 0.04) continue;
    return nearestWalkable(grid, x, y);
  }
  return null;
}
