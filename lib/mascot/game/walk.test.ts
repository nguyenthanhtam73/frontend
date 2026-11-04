import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  LOBBY_BOUNDS,
  LOBBY_FOUNTAIN,
  clampCamera,
  createWalker,
  ellipseContains,
  followCamera,
  pushGlide,
  sampleGlide,
  screenToWorld,
  segmentHits,
  steerGoal,
  stepWalker,
  zoomAt,
} from "./walk";

describe("lobby walk", () => {
  it("eases to a point and does not overshoot", () => {
    let walker = { ...createWalker({ x: 0.2, y: 0.6 }), goal: { x: 0.7, y: 0.62 } };
    let peak = 0;
    for (let i = 0; i < 180; i += 1) {
      walker = stepWalker(walker, 1 / 60, LOBBY_FOUNTAIN, LOBBY_BOUNDS, false);
      peak = Math.max(peak, walker.x);
      assert.equal(ellipseContains(walker, LOBBY_FOUNTAIN), false);
      assert.ok(walker.x >= LOBBY_BOUNDS.minX - 0.001 && walker.x <= LOBBY_BOUNDS.maxX + 0.001);
    }
    assert.ok(Math.abs(walker.x - 0.7) < 0.03);
    assert.ok(peak < 0.73);
    assert.equal(walker.goal, null);
  });

  it("routes around the fountain instead of through it", () => {
    const from = { x: 0.2, y: 0.56 };
    const via = steerGoal(from, { x: 0.85, y: 0.56 }, LOBBY_FOUNTAIN, LOBBY_BOUNDS);
    assert.equal(ellipseContains(via, LOBBY_FOUNTAIN), false);
    assert.equal(segmentHits(from, via, LOBBY_FOUNTAIN), false);
    assert.equal(segmentHits(via, { x: 0.85, y: 0.56 }, LOBBY_FOUNTAIN), false);
  });

  it("snaps when motion is reduced", () => {
    const walker = stepWalker(
      { ...createWalker({ x: 0.2, y: 0.62 }), goal: { x: 0.3, y: 0.66 } },
      1 / 60,
      null,
      LOBBY_BOUNDS,
      true,
    );
    assert.equal(walker.x, 0.3);
    assert.equal(walker.squash, 1);
    assert.equal(walker.goal, null);
  });

  it("glides remote players across the tick gap", () => {
    const glide = pushGlide(null, 0.2, 0.6, 0);
    const next = pushGlide(glide, 0.5, 0.7, 1000);
    const mid = sampleGlide(next, 1000 + 110);
    assert.ok(mid.x > 0.2 && mid.x < 0.5);
    assert.ok(mid.y > 0.6 && mid.y < 0.7);
    const end = sampleGlide(next, 1000 + 400);
    assert.equal(end.x, 0.5);
    assert.equal(end.y, 0.7);
  });
});

describe("lobby camera", () => {
  it("zooms around the cursor and keeps that world point still", () => {
    const start = { x: -40, y: -10, scale: 1 };
    const focus = { x: 120, y: 80 };
    const before = screenToWorld(focus.x, focus.y, start);
    const zoomed = zoomAt(start, 2, focus.x, focus.y);
    const after = screenToWorld(focus.x, focus.y, zoomed);
    assert.ok(Math.abs(before.x - after.x) < 0.01);
    assert.ok(Math.abs(before.y - after.y) < 0.01);
    assert.equal(zoomed.scale, 2);
    const capped = zoomAt(zoomed, 4, focus.x, focus.y);
    assert.equal(capped.scale, 2.5);
  });

  it("clamps panning to the world edges", () => {
    const camera = clampCamera({ x: 80, y: 40, scale: 1 }, 300, 400, 800, 500);
    assert.equal(camera.x, 0);
    assert.ok(camera.y <= 0);
    const wide = clampCamera({ x: -9999, y: 0, scale: 1 }, 300, 400, 800, 500);
    assert.equal(wide.x, 300 - 800);
  });

  it("follows Bé Da only while zoomed in", () => {
    const zoomed = followCamera({ x: 0, y: 0, scale: 2 }, 0.8, 0.6, 400, 600, 1000, 800, 1, true);
    assert.ok(zoomed.x < 0);
    const wide = followCamera({ x: 10, y: 4, scale: 1, }, 0.8, 0.6, 400, 600, 1000, 800, 1, true);
    assert.equal(wide.x, 10);
  });
});
