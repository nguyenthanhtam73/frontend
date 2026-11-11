import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  LOBBY_BOUNDS,
  LOBBY_FOUNTAIN,
  SPA_BOUNDS,
  clampCamera,
  createWalker,
  depthRank,
  pixelSnap,
  secondsFromDeltaTime,
  ellipseContains,
  snapOutsideFountain,
  adoptServerPoint,
  followCamera,
  planRemoteGlide,
  pushGlide,
  sampleGlide,
  screenToWorld,
  segmentHits,
  steerGoal,
  lobbyWorldSpeed,
  stepWalker,
  walkPose,
  type Walker,
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

  it("pushes feet that land on the stone rim back outside the basin", () => {
    const rim = { x: 0.5, y: 0.56 };
    assert.equal(ellipseContains(rim, LOBBY_FOUNTAIN), true);
    const out = snapOutsideFountain(rim);
    assert.equal(ellipseContains(out, LOBBY_FOUNTAIN), false);
    assert.ok(out.y > rim.y);
    const centre = snapOutsideFountain({ x: LOBBY_FOUNTAIN.x, y: LOBBY_FOUNTAIN.y });
    assert.equal(ellipseContains(centre, LOBBY_FOUNTAIN), false);
    assert.ok(centre.y > LOBBY_FOUNTAIN.y);
    const clear = snapOutsideFountain({ x: 0.2, y: 0.62 });
    assert.deepEqual(clear, { x: 0.2, y: 0.62 });
  });

  it("routes around the fountain instead of through it", () => {
    const from = { x: 0.2, y: 0.62 };
    const via = steerGoal(from, { x: 0.85, y: 0.56 }, LOBBY_FOUNTAIN, LOBBY_BOUNDS);
    assert.equal(ellipseContains(via, LOBBY_FOUNTAIN), false);
    assert.equal(segmentHits(from, via, LOBBY_FOUNTAIN), false);
    assert.equal(segmentHits(via, { x: 0.85, y: 0.56 }, LOBBY_FOUNTAIN), false);
  });

  it("covers about 90 screen pixels per second and eases in", () => {
    const worldPx = 507;
    const speed = lobbyWorldSpeed(worldPx, 1);
    assert.ok(Math.abs(speed * worldPx - 90) < 0.5);
    let early = { ...createWalker({ x: 0.1, y: 0.5 }), goal: { x: 0.9, y: 0.5 } };
    for (let i = 0; i < 8; i += 1) early = stepWalker(early, 1 / 60, null, LOBBY_BOUNDS, false, speed, true);
    const earlyRate = (early.x - 0.1) / (8 / 60);
    let later = early;
    for (let i = 0; i < 30; i += 1) later = stepWalker(later, 1 / 60, null, LOBBY_BOUNDS, false, speed, true);
    const laterRate = (later.x - early.x) / (30 / 60);
    assert.ok(earlyRate < laterRate);
    const lifted = walkPose(Math.PI / 2, true);
    assert.ok(lifted.bob <= -3 && lifted.bob >= -4);
    assert.ok(Math.abs(lifted.tilt) > 2);
    assert.ok(lifted.squash < 1.02 && lifted.squash > 0.9);
    const planted = walkPose(0, true);
    assert.equal(planted.bob, 0);
    assert.ok(planted.squash < 1);
    const lite = walkPose(Math.PI / 2, true, true);
    assert.ok(lite.bob <= -3 && lite.bob >= -4);
    assert.ok(Math.abs(lite.tilt) > 2);
    assert.equal(walkPose(0, false).bob, 0);
    assert.ok(walkPose(Math.PI, false).bob < 0 && walkPose(Math.PI, false).bob >= -2);
  });

  it("keeps ten retargets under a 5px frame step", () => {
    const worldPx = 507;
    const speed = lobbyWorldSpeed(worldPx, 1);
    let walker = createWalker({ x: 0.2, y: 0.55 });
    const goals = Array.from({ length: 10 }, (_, index) => ({
      x: 0.28 + (index % 2 === 0 ? 0.12 : -0.04) + index * 0.015,
      y: 0.5 + (index % 3) * 0.03,
    }));
    let goalIndex = 0;
    let last = { x: walker.x, y: walker.y };
    let maxPx = 0;
    for (let frame = 0; frame < 120; frame += 1) {
      if (frame % 12 === 0 && goalIndex < goals.length) {
        walker = { ...walker, goal: goals[goalIndex]! };
        goalIndex += 1;
      }
      walker = stepWalker(walker, 1 / 60, null, LOBBY_BOUNDS, false, speed, true);
      const jumped = Math.hypot((walker.x - last.x) * worldPx, (walker.y - last.y) * worldPx);
      maxPx = Math.max(maxPx, jumped);
      last = { x: walker.x, y: walker.y };
    }
    assert.equal(goalIndex, 10);
    assert.ok(maxPx < 5, `own jump ${maxPx}`);
  });

  it("glides a remote figure through ten updates under 5px a frame", () => {
    const worldW = 507;
    const worldH = 1521;
    let drawn = { x: 0.4, y: 0.55 };
    let glide: ReturnType<typeof pushGlide> = {
      fromX: drawn.x,
      fromY: drawn.y,
      toX: drawn.x,
      toY: drawn.y,
      t0: 0,
      dur: 0,
      face: 1,
    };
    let maxPx = 0;
    for (let index = 0; index < 10; index += 1) {
      const next = { x: 0.43 + index * 0.025, y: 0.55 + (index % 2) * 0.015 };
      const dx = (next.x - drawn.x) * worldW;
      const dy = (next.y - drawn.y) * worldH;
      const dur = Math.max(220, (Math.hypot(dx, dy) / 90) * 1000);
      glide = pushGlide(glide, next.x, next.y, index * 200, dur);
      for (let step = 1; step <= 12; step += 1) {
        const pos = sampleGlide(glide, index * 200 + step * (200 / 12));
        const jumped = Math.hypot((pos.x - drawn.x) * worldW, (pos.y - drawn.y) * worldH);
        maxPx = Math.max(maxPx, jumped);
        drawn = pos;
      }
    }
    assert.ok(maxPx < 5, `remote jump ${maxPx}`);
  });

  it("turns ticker deltaTime into seconds and caps a hitch", () => {
    assert.equal(secondsFromDeltaTime(1), 1 / 60);
    assert.equal(secondsFromDeltaTime(2), 2 / 60);
    assert.equal(secondsFromDeltaTime(0), 0);
    assert.equal(secondsFromDeltaTime(-1), 0);
    assert.equal(secondsFromDeltaTime(Number.NaN), 0);
    assert.equal(secondsFromDeltaTime(100), 0.05);
  });

  it("lands in the same place at 30fps and 60fps", () => {
    const speed = lobbyWorldSpeed(507, 1);
    const goal = { x: 0.84, y: 0.62 };
    let slow: Walker = { ...createWalker({ x: 0.2, y: 0.62 }), goal };
    let fast: Walker = { ...createWalker({ x: 0.2, y: 0.62 }), goal };
    for (let i = 0; i < 20; i += 1) slow = stepWalker(slow, 1 / 30, null, LOBBY_BOUNDS, false, speed, true);
    for (let i = 0; i < 40; i += 1) fast = stepWalker(fast, 1 / 60, null, LOBBY_BOUNDS, false, speed, true);
    assert.ok(Math.abs(slow.x - fast.x) < 0.03, `${slow.x} vs ${fast.x}`);
    assert.ok(fast.x > 0.2);
    assert.ok(fast.face > 0);
  });

  it("sorts nearer feet in front and snaps positions to pixels", () => {
    assert.ok(depthRank(0.42) < depthRank(0.8));
    assert.equal(depthRank(0.8), 8000);
    assert.equal(depthRank(Number.NaN), 0);
    assert.equal(pixelSnap(12.6), 13);
    assert.equal(pixelSnap(12.2), 12);
    assert.equal(pixelSnap(Number.POSITIVE_INFINITY), 0);
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

  it("glides a 2 Hz step at walk speed and snaps a respawn", () => {
    const worldW = 390;
    const worldH = 520;
    const start = planRemoteGlide(null, 0.4, 0.6, 0, worldW, worldH);
    const next = planRemoteGlide(start, 0.4 + 40 / worldW, 0.6, 500, worldW, worldH);
    assert.ok(next.dur >= 400 && next.dur <= 500, `dur ${next.dur}`);
    let drawn = sampleGlide(next, 500);
    let maxPx = 0;
    for (let step = 1; step <= 30; step += 1) {
      const pos = sampleGlide(next, 500 + step * (1000 / 60));
      maxPx = Math.max(maxPx, Math.hypot((pos.x - drawn.x) * worldW, (pos.y - drawn.y) * worldH));
      drawn = pos;
    }
    assert.ok(maxPx < 5, `frame jump ${maxPx}`);
    const far = planRemoteGlide(next, 0.4, 0.95, 1200, worldW, worldH);
    assert.equal(far.dur, 0);
    assert.equal(sampleGlide(far, 1216).y, 0.95);
  });

  it("keeps a predicted position when the server echo is close", () => {
    const local = { x: 0.42, y: 0.61 };
    assert.deepEqual(adoptServerPoint(local, { x: 0.4, y: 0.6 }, true), local);
    assert.deepEqual(adoptServerPoint(local, { x: 0.8, y: 0.9 }, true), { x: 0.8, y: 0.9 });
    assert.deepEqual(adoptServerPoint(local, { x: 0.5, y: 0.62 }, false), { x: 0.5, y: 0.62 });
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

describe("spa floor", () => {
  it("matches the Android room box walk range", () => {
    assert.deepEqual(SPA_BOUNDS, { minX: 0.08, maxX: 0.92, minY: 0.46, maxY: 0.7 });
  });

  it("clamps a walk into that floor", () => {
    let walker = { ...createWalker({ x: 0.5, y: 0.6 }), goal: { x: 0.01, y: 0.95 } };
    for (let i = 0; i < 240; i += 1) walker = stepWalker(walker, 1 / 60, null, SPA_BOUNDS, false);
    assert.ok(walker.x >= SPA_BOUNDS.minX - 0.001 && walker.x <= SPA_BOUNDS.maxX + 0.001);
    assert.ok(walker.y >= SPA_BOUNDS.minY - 0.001 && walker.y <= SPA_BOUNDS.maxY + 0.001);
    assert.equal(walker.goal, null);
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

  it("follows Bé Da across a world larger than the screen", () => {
    const zoomed = followCamera({ x: 0, y: 0, scale: 2 }, 0.8, 0.6, 400, 600, 1000, 800, 1, true);
    assert.ok(zoomed.x < 0);
    const tall = followCamera({ x: 0, y: 0, scale: 1 }, 0.5, 0.8, 400, 600, 720, 1400, 1, true);
    assert.ok(tall.y < 0);
    const stopped = followCamera({ x: 10, y: 4, scale: 1 }, 0.8, 0.6, 400, 600, 1000, 800, 1, false);
    assert.equal(stopped.x, 10);
    assert.equal(stopped.y, 4);
  });
});
