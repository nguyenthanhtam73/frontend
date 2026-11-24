import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { nearestWalkable } from "@/lib/mascot/game/lobby-walk";
import { roomWalkGrid } from "@/lib/mascot/game/room-walk";
import {
  BOB_PX,
  createTravel,
  directionFromKeys,
  blendFeet,
  footPose,
  legSwing,
  paceFactor,
  queueTap,
  STEP_PX,
  phaseForPixels,
  screenTravel,
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
      cardinal = stepTravel(cardinal, 1 / 60, grid, { dir: right, cruise: 0.28, width: 390, height: 844 });
      angled = stepTravel(angled, 1 / 60, grid, { dir: diagonal, cruise: 0.28, width: 390, height: 844 });
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
      travel = stepTravel(travel, 1 / 60, grid, { dir, cruise: 0.3, width: 390, height: 844 });
      early += travel.x - prev;
    }
    for (let i = 0; i < 30; i += 1) travel = stepTravel(travel, 1 / 60, grid, { dir, cruise: 0.3, width: 390, height: 844 });
    let mid = 0;
    for (let i = 0; i < 6; i += 1) {
      const prev = travel.x;
      travel = stepTravel(travel, 1 / 60, grid, { dir, cruise: 0.3, width: 390, height: 844 });
      mid += travel.x - prev;
    }
    assert.ok(early < mid * 0.85, `early ${early} mid ${mid}`);
    const coasting = travel.speed;
    travel = stepTravel(travel, 1 / 60, grid, { dir: null, cruise: 0.3, width: 390, height: 844 });
    assert.ok(travel.speed > 0 && travel.speed < coasting);
    for (let i = 0; i < 40; i += 1) travel = stepTravel(travel, 1 / 60, grid, { dir: null, cruise: 0.3, width: 390, height: 844 });
    assert.equal(travel.speed, 0);
    assert.equal(travel.goal, null);
    assert.equal(paceFactor(0, 0.2), 0.38);
    assert.equal(paceFactor(0.05, 0.2), 1);
    assert.ok(paceFactor(0.2, 0.01) < 0.7);
  });

  it("flips facing in one frame without a horizontal squeeze", () => {
    assert.equal(stepFace(1, -1), -1);
    assert.equal(stepFace(-1, 1), 1);
    let travel = createTravel({ x: 0.5, y: 0.74 });
    travel = stepTravel(travel, 1 / 60, grid, { dir: { x: -1, y: 0 }, cruise: 0.3, width: 390, height: 844 });
    assert.equal(travel.face, -1);
  });

  it("plants a foot with the distance and stands still with no bob", () => {
    const right = { x: 1, y: 0 };
    const moving = footPose(Math.PI / 2, true, false, right, 1);
    assert.ok(moving.bob <= 0 && moving.bob >= -BOB_PX);
    assert.ok(moving.ly < 0 || moving.ry < 0);
    assert.ok(Math.abs(moving.arm) <= 12);
    const planted = footPose(0, true, false, right, 1);
    assert.equal(planted.bob, 0);
    assert.equal(planted.ly, 0);
    assert.equal(planted.ry, 0);
    assert.equal(planted.lx, STEP_PX / 2);
    const idle = footPose(Math.PI / 2, false, false, right, 1);
    assert.deepEqual(idle, { bob: 0, lx: 0, ly: 0, rx: 0, ry: 0, arm: 0 });
    const calm = footPose(Math.PI / 2, true, true, right, 1);
    assert.equal(calm.bob, 0);
    assert.equal(calm.arm, 0);
    assert.ok(calm.ly < 0 || calm.ry < 0);
  });

  it("takes one step per 20 screen pixels, across and up", () => {
    assert.equal(phaseForPixels(STEP_PX), Math.PI);
    assert.equal(phaseForPixels(0), 0);
    const width = 400;
    const height = 800;
    let across = createTravel({ x: 0.2, y: 0.74 });
    let px = 0;
    for (let i = 0; i < 40; i += 1) {
      const prev = across.x;
      across = stepTravel(across, 1 / 60, grid, { dir: { x: 1, y: 0 }, cruise: 0.4, width, height });
      px += screenTravel(across.x - prev, 0, width, height);
    }
    const steps = across.phase / Math.PI;
    assert.ok(steps > 1, `steps ${steps}`);
    assert.ok(Math.abs(px / steps - STEP_PX) < 0.6, `${px}px over ${steps} steps`);

    let up = createTravel({ x: 0.5, y: 0.78 });
    let upPx = 0;
    for (let i = 0; i < 20; i += 1) {
      const prev = up.y;
      up = stepTravel(up, 1 / 60, grid, { dir: { x: 0, y: -1 }, cruise: 0.25, width, height });
      upPx += screenTravel(0, up.y - prev, width, height);
    }
    const upSteps = up.phase / Math.PI;
    assert.ok(upSteps > 0.4, `up steps ${upSteps}`);
    assert.ok(Math.abs(upPx / upSteps - STEP_PX) < 0.6, `up ${upPx}px over ${upSteps}`);
    assert.ok(STEP_PX >= 18 && STEP_PX <= 22);
  });

  it("walks a floor tap from 0.40, 0.69 to 0.70, 0.65", () => {
    const tap = { x: 0.7, y: 0.65 };
    let travel = queueTap(createTravel({ x: 0.4, y: 0.69 }), grid, tap);
    assert.ok(travel.goal, "route");
    const landed = nearestWalkable(grid, tap.x, tap.y);
    for (let i = 0; i < 700 && (travel.goal || travel.route.length > 0); i += 1) {
      travel = stepTravel(travel, 1 / 60, grid, { dir: null, cruise: 0.32, width: 390, height: 844 });
    }
    assert.equal(travel.goal, null);
    assert.ok(Math.hypot(travel.x - landed.x, travel.y - landed.y) < 0.02, `${travel.x},${travel.y} vs ${landed.x},${landed.y}`);
    assert.ok(Math.hypot(travel.x - tap.x, travel.y - tap.y) < 0.04, `${travel.x},${travel.y}`);
    assert.ok(travel.x > 0.6);
    assert.equal(footPose(travel.phase, false, false, null, 1).bob, 0);
  });

  it("locks the planted shoe to the floor and swings the opposite arm", () => {
    const dir = { x: 1, y: 0 };
    let locked = 0;
    for (let px = 0; px < STEP_PX; px += 1) {
      const pose = footPose(phaseForPixels(px), true, false, dir, 1);
      const world = px + pose.lx;
      if (px === 0) locked = world;
      assert.ok(Math.abs(world - locked) < 0.05, `planted shoe slid to ${world} at ${px}px`);
      assert.equal(pose.ly, 0);
      if (px > 0 && px < STEP_PX) assert.ok(pose.ry < 0, "the other shoe is in the air");
    }
    const leftForward = footPose(0, true, false, dir, 1);
    assert.ok(leftForward.lx > leftForward.rx);
    assert.ok(leftForward.arm <= -8 && leftForward.arm >= -12);
    const rightForward = footPose(phaseForPixels(STEP_PX), true, false, dir, 1);
    assert.ok(rightForward.rx > rightForward.lx);
    assert.ok(rightForward.arm >= 8 && rightForward.arm <= 12);
    const stood = blendFeet(leftForward, 1);
    assert.equal(stood.lx, 0);
    assert.equal(stood.arm, 0);
    assert.equal(stood.bob, 0);
    const mid = blendFeet(leftForward, 0.5);
    assert.ok(Math.abs(mid.lx) < Math.abs(leftForward.lx));
    assert.ok(Math.abs(mid.arm) < Math.abs(leftForward.arm));
  });

  it("plants the sole by rotating from the hip", () => {
    const leg = 33.6;
    for (const x of [-10, -4, 0, 6, 10]) {
      for (const y of [0, -8]) {
        const draw = legSwing(x, y, leg);
        const theta = (draw.degrees * Math.PI) / 180;
        const shoeX = -leg * Math.sin(theta);
        const shoeY = leg * Math.cos(theta) + draw.y;
        assert.ok(Math.abs(shoeX - x) < 0.05, `shoe x ${shoeX} vs ${x}`);
        assert.ok(Math.abs(shoeY - (leg + y)) < 0.05, `shoe y ${shoeY} vs ${leg + y}`);
      }
    }
    assert.equal(legSwing(0, 0, leg).degrees, 0);
    assert.ok(legSwing(10, 0, leg).degrees < 0);
  });
});
