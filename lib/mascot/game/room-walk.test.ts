import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { inflateSync } from "node:zlib";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { isWalkable, segmentStaysWalkable } from "@/lib/mascot/game/lobby-walk";
import {
  ROOM_BOUNDS,
  ROOM_SPAWN,
  ROOM_WALK_MASK,
  paintRoomMask,
  roomBlockName,
  roomBlocked,
  roomRoute,
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
    assert.equal(ROOM_WALK_MASK.includes(`?v=${digest}`), true);
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
    assert.equal(roomBlockName(0.1, 0.66), "bed");
    assert.equal(roomBlockName(0.3, 0.68), "closet");
    assert.equal(roomBlockName(0.5, 0.4), "wall");
    assert.equal(roomBlockName(0.85, 0.66), "sink");
    assert.equal(roomBlockName(0.64, 0.64), "plant");
    assert.equal(isWalkable(grid, 0.1, 0.66), false);
    assert.equal(isWalkable(grid, 0.3, 0.68), false);
    assert.equal(isWalkable(grid, 0.5, 0.4), false);
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
    assert.ok(walker.y >= 0.64);
    let prev = ROOM_SPAWN;
    for (const point of route) {
      assert.equal(segmentStaysWalkable(grid, prev, point), true);
      prev = point;
    }
  });

  it("crosses the open floor without cutting the closet", () => {
    const route = roomRoute(grid, { x: 0.12, y: 0.78 }, { x: 0.88, y: 0.78 });
    assert.ok(route.length > 0);
    for (const point of route) {
      assert.equal(roomBlockName(point.x, point.y), null);
      assert.ok(point.y >= 0.74);
    }
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
