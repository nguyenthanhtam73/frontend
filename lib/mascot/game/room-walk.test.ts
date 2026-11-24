import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { inflateSync } from "node:zlib";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { MASCOT_ASSET_VERSION } from "@/lib/mascot/asset-url";
import { isWalkable, segmentStaysWalkable } from "@/lib/mascot/game/lobby-walk";
import {
  ROOM_BOUNDS,
  ROOM_SPAWN,
  ROOM_WALK_MASK,
  paintRoomMask,
  blockRoomRect,
  roomBlockName,
  sealRoomNav,
  roomBlocked,
  roomDepthScale,
  roomNudge,
  roomRoute,
  roomSortIndex,
  roomStepTo,
  roomWalkGrid,
  roomWanderGoal,
} from "@/lib/mascot/game/room-walk";
import { createWalker, stepWalker, walkPose } from "@/lib/mascot/game/walk";

const maskPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../public/mascot/room/walk-mask.png");

function readGrayPng(file: string): { width: number; height: number; pixels: Uint8Array } {
  const buf = fs.readFileSync(file);
  assert.equal(buf.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  let offset = 8;
  let width = 0;
  let height = 0;
  const idat: Buffer[] = [];
  while (offset < buf.length) {
    const length = buf.readUInt32BE(offset);
    const type = buf.toString("ascii", offset + 4, offset + 8);
    const data = buf.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      assert.equal(data[8], 8);
      assert.equal(data[9], 0);
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") break;
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const pixels = new Uint8Array(width * height);
  let index = 0;
  let prev = new Uint8Array(width);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[index]!;
    index += 1;
    const row = raw.subarray(index, index + width);
    index += width;
    const out = new Uint8Array(width);
    for (let x = 0; x < width; x += 1) {
      const left = x > 0 ? out[x - 1]! : 0;
      const up = prev[x]!;
      const ul = x > 0 ? prev[x - 1]! : 0;
      let value = row[x]!;
      if (filter === 1) value = (value + left) & 255;
      else if (filter === 2) value = (value + up) & 255;
      else if (filter === 3) value = (value + Math.floor((left + up) / 2)) & 255;
      else if (filter === 4) {
        const p = left + up - ul;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - ul);
        const pred = pa <= pb && pa <= pc ? left : pb <= pc ? up : ul;
        value = (value + pred) & 255;
      }
      out[x] = value;
    }
    pixels.set(out, y * width);
    prev = out;
  }
  return { width, height, pixels };
}

describe("personal room floor", () => {
  const grid = roomWalkGrid();

  it("versions the mask so the immutable /mascot cache cannot keep an old one", () => {
    const digest = createHash("sha256").update(fs.readFileSync(maskPath)).digest("hex").slice(0, 10);
    const params = new URL(ROOM_WALK_MASK, "https://dadiary.vn").searchParams;
    assert.equal(params.get("v"), MASCOT_ASSET_VERSION);
    assert.equal(params.get("h"), digest);
  });

  it("ships a mask that matches the furniture blocks", () => {
    const png = readGrayPng(maskPath);
    const painted = paintRoomMask(png.width, png.height);
    assert.equal(png.pixels.length, painted.length);
    for (let i = 0; i < painted.length; i += 17) {
      assert.equal(png.pixels[i]! >= 128, painted[i]! >= 128);
    }
  });

  it("stands on open floor and keeps the bed, closet, wall, and sink blocked", () => {
    assert.equal(roomBlocked(ROOM_SPAWN.x, ROOM_SPAWN.y), false);
    assert.equal(isWalkable(grid, ROOM_SPAWN.x, ROOM_SPAWN.y), true);
    assert.equal(roomBlockName(0.18, 0.64), "bed");
    assert.equal(roomBlockName(0.3, 0.65), "closet");
    assert.equal(roomBlockName(0.5, 0.4), "wall");
    assert.equal(roomBlockName(0.85, 0.64), "sink");
    assert.equal(roomBlockName(0.64, 0.64), "plant");
    assert.equal(roomBlockName(0.5, 0.9), "nav");
    assert.equal(isWalkable(grid, 0.12, 0.64), false);
    assert.equal(isWalkable(grid, 0.3, 0.62), false);
    assert.equal(isWalkable(grid, 0.5, 0.4), false);
    assert.equal(isWalkable(grid, ROOM_SPAWN.x, ROOM_SPAWN.y - 0.08), true);
    assert.equal(isWalkable(grid, 0.2, 0.74), true);
    assert.equal(isWalkable(grid, 0.84, 0.74), true);
  });

  it("walks a tap on the bed to the nearest floor and stays off the furniture", () => {
    const route = roomRoute(grid, ROOM_SPAWN, { x: 0.1, y: 0.5 });
    assert.ok(route.length > 0);
    let walker = createWalker(ROOM_SPAWN);
    walker.goal = route[0] ?? null;
    const pending = route.slice(1);
    for (let i = 0; i < 400 && (walker.goal || pending.length); i += 1) {
      walker = stepWalker(walker, 1 / 30, null, ROOM_BOUNDS, false, 0.35, true);
      assert.equal(roomBlocked(walker.x, walker.y), false, `${walker.x},${walker.y}`);
      if (!walker.goal && pending.length) walker.goal = pending.shift() ?? null;
    }
    assert.equal(walker.goal, null);
    assert.equal(roomBlockName(walker.x, walker.y), null);
    assert.ok(walker.y >= 0.6);
    let prev = ROOM_SPAWN;
    for (const point of route) {
      assert.equal(segmentStaysWalkable(grid, prev, point), true);
      prev = point;
    }
  });

  it("crosses the open floor without cutting the closet", () => {
    const route = roomRoute(grid, { x: 0.2, y: 0.74 }, { x: 0.84, y: 0.74 });
    assert.ok(route.length > 0);
    for (const point of route) {
      assert.equal(roomBlockName(point.x, point.y), null);
      assert.ok(point.y >= 0.68);
    }
  });

  it("steps up, down, left, and right, and stops at the furniture", () => {
    const up = roomNudge(grid, ROOM_SPAWN, "up");
    const down = roomNudge(grid, ROOM_SPAWN, "down");
    const left = roomNudge(grid, ROOM_SPAWN, "left");
    const right = roomNudge(grid, ROOM_SPAWN, "right");
    assert.ok(up && up.y < ROOM_SPAWN.y);
    assert.ok(down && down.y > ROOM_SPAWN.y);
    assert.ok(left && left.x < ROOM_SPAWN.x);
    assert.ok(right && right.x > ROOM_SPAWN.x);
    for (const point of [up, down, left, right]) {
      assert.equal(roomBlocked(point!.x, point!.y), false);
    }
    assert.equal(roomNudge(grid, { x: 0.5, y: 0.65 }, "up"), null);
    assert.ok(roomDepthScale(0.76) > roomDepthScale(0.62));
    assert.equal(roomSortIndex(0.76), 42);
    assert.equal(roomSortIndex(0.62), 42);
    assert.equal(roomBlockName(0.76, 0.66), "sink");
    assert.equal(roomBlocked(0.7, 0.72), false);
    const intoBed = roomStepTo(grid, ROOM_SPAWN, { x: 0.18, y: 0.62 });
    assert.equal(roomBlocked(intoBed.x, intoBed.y), false);
    let walker = createWalker(ROOM_SPAWN);
    walker.goal = { x: 0.5, y: 0.4 };
    let prev = { x: walker.x, y: walker.y };
    for (let i = 0; i < 180; i += 1) {
      const next = stepWalker(walker, 1 / 30, null, ROOM_BOUNDS, false, 0.35, true);
      const stepped = roomStepTo(grid, prev, next);
      assert.equal(roomBlocked(stepped.x, stepped.y), false);
      assert.ok(Math.hypot(stepped.x - prev.x, stepped.y - prev.y) < 0.05);
      const stopped = Math.hypot(stepped.x - next.x, stepped.y - next.y) > 0.0001;
      walker = { ...next, x: stepped.x, y: stepped.y, goal: stopped ? null : next.goal };
      prev = { x: walker.x, y: walker.y };
      if (!walker.goal) break;
    }
    assert.equal(walker.goal, null);
    assert.ok(walker.y >= 0.6);
    assert.equal(roomBlockName(walker.x, walker.y), null);
  });

  it("steps around the wardrobe onto the floor beside the pad", () => {
    assert.equal(isWalkable(grid, 0.37, 0.67), true);
    assert.equal(roomBlockName(0.3, 0.65), "closet");
    const route = roomRoute(grid, { x: 0.5, y: 0.67 }, { x: 0.22, y: 0.78 });
    assert.ok(route.length > 0);
    let prev = { x: 0.5, y: 0.67 };
    for (const point of route) {
      assert.equal(roomBlockName(point.x, point.y), null);
      assert.equal(segmentStaysWalkable(grid, prev, point), true);
      prev = point;
    }
    const end = route[route.length - 1]!;
    assert.ok(end.x < 0.3);
    assert.ok(end.y > 0.74);
  });

  it("seals only the real nav and still reaches a tap beside the old pad", () => {
    const open = roomWalkGrid();
    assert.equal(isWalkable(open, 0.7, 0.65) || isWalkable(open, 0.7, 0.67), true);
    sealRoomNav(open, 0.8);
    assert.equal(isWalkable(open, 0.7, 0.65) || Math.hypot(0.7 - 0.7, 0.65 - 0.67) < 0.04, true);
    assert.equal(isWalkable(open, 0.5, 0.9), false);
    const untouched = roomWalkGrid();
    sealRoomNav(untouched, 0.2);
    assert.equal(isWalkable(untouched, 0.5, 0.74), isWalkable(roomWalkGrid(), 0.5, 0.74));
  });

  it("keeps the arrow pad off the walkable floor", () => {
    const blocked = roomWalkGrid();
    blockRoomRect(blocked, { x0: 0.58, y0: 0.74, x1: 1, y1: 0.86 });
    assert.equal(isWalkable(blocked, 0.7, 0.78), false);
    assert.equal(isWalkable(blocked, 0.5, 0.78), true);
    const stopped = roomStepTo(blocked, { x: 0.5, y: 0.78 }, { x: 0.8, y: 0.78 });
    assert.equal(isWalkable(blocked, stopped.x, stopped.y), true);
    assert.ok(stopped.x < 0.58);
  });

  it("wanders only onto a walkable cell", () => {
    const rolls = [0.2, 0.8, 0.4, 0.6, 0.1, 0.9, 0.3, 0.7];
    let i = 0;
    const goal = roomWanderGoal(grid, ROOM_SPAWN, () => rolls[i++] ?? 0.5);
    assert.ok(goal);
    assert.equal(isWalkable(grid, goal.x, goal.y), true);
    assert.equal(roomBlocked(goal.x, goal.y), false);
  });

  it("lifts her feet between steps and rests them when she is still", () => {
    const planted = walkPose(0, true);
    const lifted = walkPose(Math.PI / 2, true);
    const breath = walkPose(Math.PI, false);
    assert.equal(planted.bob, 0);
    assert.ok(lifted.bob < 0);
    assert.ok(breath.bob < 0);
    assert.equal(walkPose(0, false).bob, 0);
  });
});
