import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { stackNameLabels } from "@/lib/mascot/game/lobby";
import { blockEllipse, findRoute, isWalkable, nearestWalkable, segmentStaysWalkable, type WalkGrid } from "@/lib/mascot/game/lobby-walk";
import { LOBBY_FOUNTAIN } from "@/lib/mascot/game/walk";

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

  it("does not cut the blocked corner between two diagonal cells", () => {
    const corner = grid(["#.", ".."]);
    const from = { x: 0.25, y: 0.75 };
    const to = { x: 0.75, y: 0.25 };
    assert.equal(segmentStaysWalkable(corner, from, to), false);
    const route = findRoute(corner, from, to);
    assert.ok(route.length >= 1);
    let prev = from;
    for (const point of route) {
      assert.equal(segmentStaysWalkable(corner, prev, point), true);
      assert.equal(isWalkable(corner, point.x, point.y), true);
      prev = point;
    }
  });

  it("keeps a ring path around the fountain and never a chord through it", () => {
    const ring = grid([
      ".......",
      "..###..",
      ".#...#.",
      ".#...#.",
      ".#...#.",
      "..###..",
      ".......",
    ]);
    const route = findRoute(ring, { x: 0.08, y: 0.5 }, { x: 0.92, y: 0.5 });
    assert.ok(route.length >= 2);
    let prev = { x: 0.08, y: 0.5 };
    for (const point of route) {
      assert.equal(segmentStaysWalkable(ring, prev, point), true);
      assert.equal(isWalkable(ring, point.x, point.y), true);
      const nx = (point.x - 0.5) / 0.2;
      const ny = (point.y - 0.5) / 0.2;
      assert.ok(nx * nx + ny * ny > 1);
      prev = point;
    }
  });

  it("blocks every cell that touches the fountain basin", () => {
    const open = grid([".....", ".....", ".....", ".....", "....."]);
    blockEllipse(open, LOBBY_FOUNTAIN);
    assert.equal(isWalkable(open, 0.5, 0.5), false);
    assert.equal(isWalkable(open, 0.5, 0.9), true);
    const inside = nearestWalkable(open, 0.5, 0.5);
    const nx = (inside.x - 0.5) / LOBBY_FOUNTAIN.rx;
    const ny = (inside.y - 0.5) / LOBBY_FOUNTAIN.ry;
    assert.ok(nx * nx + ny * ny > 1);
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
