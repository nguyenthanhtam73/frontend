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

  it("stops on her side of a wall when the target cannot be reached", () => {
    const split = grid([
      "...#...",
      "...#...",
      "...#...",
      "...#...",
      "...#...",
      "...#...",
      "...#...",
    ]);
    const route = findRoute(split, { x: 0.1, y: 0.5 }, { x: 0.9, y: 0.5 });
    assert.ok(route.length >= 1);
    for (const point of route) {
      assert.equal(isWalkable(split, point.x, point.y), true);
      assert.ok(point.x < 0.5);
    }
  });

  it("returns no route from a fully black mask", () => {
    const black = grid(["###", "###", "###"]);
    const spot = nearestWalkable(black, 0.5, 0.5);
    assert.equal(isWalkable(black, spot.x, spot.y), false);
    assert.deepEqual(findRoute(black, { x: 0.2, y: 0.2 }, { x: 0.8, y: 0.8 }), []);
  });

  it("begins on the nearest path when she starts off it", () => {
    const edge = grid(["#....", "#....", "#....", "#....", "#...."]);
    const route = findRoute(edge, { x: 0.05, y: 0.5 }, { x: 0.9, y: 0.5 });
    assert.ok(route.length >= 1);
    for (const point of route) assert.equal(isWalkable(edge, point.x, point.y), true);
    assert.ok(route[route.length - 1]!.x > 0.7);
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
