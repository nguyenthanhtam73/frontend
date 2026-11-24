import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { nearestWalkable } from "@/lib/mascot/game/lobby-walk";
import { roomWalkGrid } from "@/lib/mascot/game/room-walk";
import {
  BOB_PX,
  createTravel,
  directionFromKeys,
  footPose,
  paceFactor,
  queueTap,
  stepFace,
  stepTravel,
} from "@/lib/mascot/game/stride";

const grid = roomWalkGrid();

describe("room stride", () => {
  it("normalizes diagonal keys so two arrows are not faster", () => {
    const diagonal = directionFromKeys({ up: true, down: false, left: false, right: true });
    const right = directionFromKeys({ up: false, down: false, left: false, right: true });
    const none = directionFromKeys({ up: true, down: true, left: true, right: true });
    assert.ok(diagonal);
    assert.ok(right);
    assert.equal(none, null);
    assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-6);
    assert.ok(Math.abs(diagonal.x - Math.SQRT1_2) < 1e-6);
    assert.ok(Math.abs(diagonal.y + Math.SQRT1_2) < 1e-6);
    assert.deepEqual(right, { x: 1, y: 0 });

    let cardinal = createTravel({ x: 0.42, y: 0.76 });
    let angled = createTravel({ x: 0.42, y: 0.76 });
    for (let i = 0; i < 24; i += 1) {
      cardinal = stepTravel(cardinal, 1 / 60, grid, { dir: right, cruise: 0.28 });
      angled = stepTravel(angled, 1 / 60, grid, { dir: diagonal, cruise: 0.28 });
    }
    const straight = Math.hypot(cardinal.x - 0.42, cardinal.y - 0.76);
    const both = Math.hypot(angled.x - 0.42, angled.y - 0.76);
    assert.ok(straight > 0.04, `cardinal ${straight}`);
    assert.ok(Math.abs(straight - both) / straight < 0.12, `diagonal ${both} vs ${straight}`);
    assert.ok(angled.x > 0.3 && angled.y < 0.74);
  });

  it("eases in when a key is held and eases out when it is released", () => {
    let travel = createTravel({ x: 0.22, y: 0.74 });
    const dir = { x: 1, y: 0 };
    let early = 0;
    for (let i = 0; i < 6; i += 1) {
      const prev = travel.x;
      travel = stepTravel(travel, 1 / 60, grid, { dir, cruise: 0.3 });
      early += travel.x - prev;
    }
    for (let i = 0; i < 30; i += 1) travel = stepTravel(travel, 1 / 60, grid, { dir, cruise: 0.3 });
    let mid = 0;
    for (let i = 0; i < 6; i += 1) {
      const prev = travel.x;
      travel = stepTravel(travel, 1 / 60, grid, { dir, cruise: 0.3 });
      mid += travel.x - prev;
    }
    assert.ok(early < mid * 0.85, `early ${early} mid ${mid}`);
    const coasting = travel.speed;
    travel = stepTravel(travel, 1 / 60, grid, { dir: null, cruise: 0.3 });
    assert.ok(travel.speed > 0 && travel.speed < coasting);
    for (let i = 0; i < 40; i += 1) travel = stepTravel(travel, 1 / 60, grid, { dir: null, cruise: 0.3 });
    assert.equal(travel.speed, 0);
    assert.equal(travel.goal, null);
    assert.equal(paceFactor(0, 0.2), 0.38);
    assert.equal(paceFactor(0.05, 0.2), 1);
    assert.ok(paceFactor(0.2, 0.01) < 0.7);
  });

  it("turns through a narrow scale instead of flipping in one frame", () => {
    let face = 1;
    const first = stepFace(face, -1, 1 / 60);
    assert.ok(first > 0.5, `flipped too soon ${first}`);
    face = first;
    for (let i = 0; i < 5; i += 1) face = stepFace(face, -1, 1 / 60);
    assert.ok(Math.abs(face) < 0.35, `not narrow yet ${face}`);
    for (let i = 0; i < 8; i += 1) face = stepFace(face, -1, 1 / 60);
    assert.equal(face, -1);
  });

  it("plants a foot with the distance and stands still with no bob", () => {
    const moving = footPose(Math.PI / 2, true, 24, false);
    assert.ok(moving.bob <= 0 && moving.bob >= -BOB_PX);
    assert.ok(moving.ly < 0 || moving.ry < 0);
    assert.ok(Math.abs(moving.arm) <= 5);
    const planted = footPose(0, true, 24, false);
    assert.equal(planted.bob, 0);
    assert.equal(planted.ly, 0);
    assert.equal(planted.ry, 0);
    const idle = footPose(Math.PI / 2, false, 24, false);
    assert.deepEqual(idle, { bob: 0, lx: 0, ly: 0, rx: 0, ry: 0, arm: 0 });
    const calm = footPose(Math.PI / 2, true, 24, true);
    assert.equal(calm.bob, 0);
    assert.equal(calm.arm, 0);
    assert.ok(calm.ly < 0 || calm.ry < 0);
  });

  it("walks a floor tap from 0.40, 0.69 to 0.70, 0.65", () => {
    const tap = { x: 0.7, y: 0.65 };
    let travel = queueTap(createTravel({ x: 0.4, y: 0.69 }), grid, tap);
    assert.ok(travel.goal, "route");
    const landed = nearestWalkable(grid, tap.x, tap.y);
    for (let i = 0; i < 700 && (travel.goal || travel.route.length > 0); i += 1) {
      travel = stepTravel(travel, 1 / 60, grid, { dir: null, cruise: 0.32 });
    }
    assert.equal(travel.goal, null);
    assert.ok(Math.hypot(travel.x - landed.x, travel.y - landed.y) < 0.02, `${travel.x},${travel.y} vs ${landed.x},${landed.y}`);
    assert.ok(Math.hypot(travel.x - tap.x, travel.y - tap.y) < 0.04, `${travel.x},${travel.y}`);
    assert.ok(travel.x > 0.6);
    assert.equal(footPose(travel.phase, false, 20, false).bob, 0);
  });
});
