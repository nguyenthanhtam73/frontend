import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { stackNameLabels } from "@/lib/mascot/game/lobby";
import { findRoute, isWalkable, nearestWalkable, type WalkGrid } from "@/lib/mascot/game/lobby-walk";

function grid(rows: string[]): WalkGrid {
  const cols = rows[0]!.length;
  const walk = new Uint8Array(cols * rows.length);
  rows.forEach((row, r) => {
    for (let c = 0; c < cols; c += 1) walk[r * cols + c] = row[c] === "." ? 1 : 0;
  });
  return { cols, rows: rows.length, walk };
}

describe("lobby walk mask", () => {
  const plaza = grid([
    ".......",
    "...#...",
    "...#...",
    "...#...",
    "...#...",
    "...#...",
    ".......",
  ]);

  it("routes around a blocked fountain instead of through it", () => {
    const route = findRoute(plaza, { x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 });
    assert.ok(route.length >= 1);
    const bends = route.some((point) => Math.abs(point.y - 0.5) > 0.12);
    assert.equal(bends, true);
    for (const point of route) assert.equal(isWalkable(plaza, point.x, point.y), true);
  });

  it("sends a tap on grass to the nearest path cell", () => {
    const spot = nearestWalkable(plaza, 0.5, 0.5);
    assert.equal(isWalkable(plaza, spot.x, spot.y), true);
    assert.ok(Math.abs(spot.x - 0.5) > 0.05 || Math.abs(spot.y - 0.5) > 0.05);
  });

  it("stays put when the tap is the cell she is already on", () => {
    assert.deepEqual(findRoute(plaza, { x: 0.1, y: 0.1 }, { x: 0.12, y: 0.1 }), []);
  });

  it("moves the lower name down when two pills overlap", () => {
    const stacked = stackNameLabels([
      { x: 100, y: 40, w: 80, h: 22 },
      { x: 110, y: 48, w: 70, h: 22 },
    ]);
    const lower = stacked.find((label) => label.y !== 40)!;
    assert.ok(lower.y >= 62);
  });
});
