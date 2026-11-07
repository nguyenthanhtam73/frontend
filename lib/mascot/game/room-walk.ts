/**
 * Personal-room floor. White on `walk-mask.png` is where her feet may stand.
 * The picture matches `ROOM_BLOCKS`: wall and window above the planks, the
 * nav along the bottom, and pads in front of the bed, closet, plant, and sink.
 * The query hash is the file's sha256 prefix so the year-long /mascot cache
 * cannot keep an older mask.
 */

import { findRoute, gridFromMask, gridSize, isWalkable, nearestWalkable, type WalkGrid, type WalkPoint } from "@/lib/mascot/game/lobby-walk";

export const ROOM_WALK_MASK = "/mascot/room/walk-mask.png?v=866dc5866a";
export const ROOM_MASK_PX = 256;
/** Logical room used only to size the path grid (~20px cells). */
export const ROOM_WORLD = 1000;

export const ROOM_SPAWN: WalkPoint = { x: 0.48, y: 0.76 };

/** Feet stay on the planks, clear of the nav. */
export const ROOM_BOUNDS = { minX: 0.06, maxX: 0.94, minY: 0.64, maxY: 0.82 } as const;

/**
 * Normalized blocks, half-open. Furniture pads cover the base of each prop
 * across phone and iPad widths, plus a step of floor in front so she does
 * not stand inside the bed or the closet.
 */
export const ROOM_BLOCKS: readonly { x0: number; y0: number; x1: number; y1: number; name: string }[] = [
  { name: "wall", x0: 0, y0: 0, x1: 1, y1: 0.64 },
  { name: "nav", x0: 0, y0: 0.82, x1: 1, y1: 1 },
  { name: "left", x0: 0, y0: 0, x1: 0.06, y1: 1 },
  { name: "right", x0: 0.94, y0: 0, x1: 1, y1: 1 },
  { name: "bed", x0: 0, y0: 0.58, x1: 0.24, y1: 0.72 },
  { name: "closet", x0: 0.18, y0: 0.58, x1: 0.4, y1: 0.74 },
  { name: "plant", x0: 0.56, y0: 0.58, x1: 0.76, y1: 0.7 },
  { name: "sink", x0: 0.74, y0: 0.58, x1: 1, y1: 0.72 },
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
