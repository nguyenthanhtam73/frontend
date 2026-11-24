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

export const ROOM_WALK_MASK = mascotAssetUrl("/mascot/room/walk-mask.png?v=b8b3891a73");
export const ROOM_MASK_PX = 256;
/** Logical room used only to size the path grid (~20px cells). */
export const ROOM_WORLD = 1000;

/**
 * Feet stay on the planks. The floor painting starts at 58% and the nav
 * covers the bottom strip, so y runs from just in front of the baseboard
 * to a step above the nav. x keeps her body on a 390px phone and an iPad.
 */
export const ROOM_BOUNDS = { minX: 0.1, maxX: 0.9, minY: 0.6, maxY: 0.78 } as const;

/** Furniture shares this z-index. Her sort index crosses it as she walks down. */
export const ROOM_PROP_Z = 42;

export const ROOM_SPAWN: WalkPoint = { x: 0.5, y: 0.72 };

/**
 * Normalized blocks, half-open. The wall is everything above the planks.
 * Furniture rects are the bed, wardrobe, plant, and sink footprints, with a
 * short pad of floor in front so she does not stand inside them. The quest
 * rect keeps her head out from behind the task card on a phone.
 */
export const ROOM_BLOCKS: readonly { x0: number; y0: number; x1: number; y1: number; name: string }[] = [
  { name: "wall", x0: 0, y0: 0, x1: 1, y1: 0.6 },
  { name: "nav", x0: 0, y0: 0.8, x1: 1, y1: 1 },
  { name: "left", x0: 0, y0: 0, x1: 0.08, y1: 1 },
  { name: "right", x0: 0.92, y0: 0, x1: 1, y1: 1 },
  { name: "bed", x0: 0, y0: 0.56, x1: 0.26, y1: 0.7 },
  { name: "closet", x0: 0.18, y0: 0.56, x1: 0.4, y1: 0.7 },
  { name: "plant", x0: 0.54, y0: 0.56, x1: 0.76, y1: 0.68 },
  { name: "sink", x0: 0.74, y0: 0.56, x1: 1, y1: 0.7 },
  { name: "quest", x0: 0, y0: 0.6, x1: 0.48, y1: 0.64 },
];

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

/** Tap anywhere. Furniture and the wall become the nearest open floor cell. */
export function roomRoute(grid: WalkGrid, from: WalkPoint, to: WalkPoint): WalkPoint[] {
  return findRoute(grid, from, nearestWalkable(grid, to.x, to.y));
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
  const span = ROOM_BOUNDS.maxY - ROOM_BOUNDS.minY;
  const t = clamp((y - ROOM_BOUNDS.minY) / span, 0, 1);
  return 36 + Math.round(t * 12);
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
