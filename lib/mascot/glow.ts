/**
 * Bé Da glow. The server owns the points and the level.
 * The client draws `glow_level` (missing → 1) and a bar from `glow_progress` (0–1).
 * It does not know day or point thresholds.
 *
 * The pink headband shows from level 3 and the star clip from level 4.
 * A shop grant (`source: "shop"`) shows either one earlier.
 */

import { DEFAULT_MASCOT_IDS } from "@/lib/mascot/catalog";

export const HEADBAND_GLOW_LEVEL = 3;
export const STAR_CLIP_GLOW_LEVEL = 4;

const SHOP_SOURCE = "shop";

/** Missing or junk `glow_level` is 1. Any higher integer still picks `level_N` art. */
export function clampGlowLevel(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return atLeastOne(value);
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.trim());
    if (Number.isFinite(n)) return atLeastOne(n);
  }
  return 1;
}

function atLeastOne(n: number): number {
  const i = Math.trunc(n);
  return i < 1 ? 1 : i;
}

export function parseLevelUp(value: unknown): boolean {
  return value === true;
}

/** `glow_progress` is 0–1 (1 at the last level). Missing or junk stays hidden. */
export function parseGlowProgress(value: unknown): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value.trim()) : NaN;
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return 0;
  if (n >= 1) return 1;
  return n;
}

/** Point totals are stored only. The bar never prints them. */
export function parseGlowPoints(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return null;
}

export function isShopSource(source: string | null | undefined): boolean {
  return (source ?? "").trim().toLowerCase() === SHOP_SOURCE;
}

/**
 * Headband stays off below level 3 and the star clip below level 4,
 * unless that item is owned from the shop. Other accessories are not gated.
 */
export function accessoryUnlocked(id: string, glowLevel: number, shopOwned = false): boolean {
  if (shopOwned) return true;
  if (id === DEFAULT_MASCOT_IDS.headband) return glowLevel >= HEADBAND_GLOW_LEVEL;
  if (id === DEFAULT_MASCOT_IDS.accessory) return glowLevel >= STAR_CLIP_GLOW_LEVEL;
  return true;
}
