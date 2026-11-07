import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { shellArt } from "@/lib/game/core/art";
import { startShellClock } from "@/lib/game/core/clock";
import { cappedDpr, MAX_DPR, rendererResolution } from "@/lib/game/core/dpr";
import { arrowGoal, gestureKind, pointerGesture, pointerKind, walkTargetChanges } from "@/lib/game/core/input";
import { applyPinch, easeZoom, panCamera, wheelZoomFactor } from "@/lib/game/core/zoom";
import { screenToWorld, zoomAt } from "@/lib/mascot/game/walk";
import { emptyRemoteBook, stepRemotes } from "@/lib/game/core/movement";
import { readRoomList, roomEnterLabel } from "@/lib/game/core/rooms";
import { GAME_EMBED_PATH, GAME_SESSION_STORAGE_KEY, hasGameSession } from "@/lib/game/core/session";
import { DEFAULT_GAME_LOOK } from "@/lib/mascot/game/look";
import { defaultSnapshot, resolveBeDaView } from "@/lib/mascot/model";

describe("pixi shell", () => {
  it("caps the framebuffer at 2", () => {
    assert.equal(MAX_DPR, 2);
    assert.equal(cappedDpr(3), 2);
    assert.equal(cappedDpr(1.5), 1.5);
    assert.equal(cappedDpr(0), 1);
    assert.equal(rendererResolution(2, 390, 844), 2);
    assert.equal(rendererResolution(3, 390, 844), 2);
    assert.equal(rendererResolution(2, 1024, 1366), 1.5);
    assert.equal(rendererResolution(2, 1366, 1024), 1.5);
    assert.equal(rendererResolution(1, 1024, 1366), 1);
  });

  it("treats a short press as a tap and a slide as a drag", () => {
    assert.equal(pointerKind(4), "tap");
    assert.equal(pointerKind(24), "drag");
    assert.equal(pointerGesture(2, 40), "pinch");
    assert.equal(pointerGesture(1, 24), "drag");
    assert.deepEqual(arrowGoal({ x: 0.5, y: 0.6 }, "ArrowLeft"), { x: 0.44, y: 0.6 });
    assert.equal(arrowGoal({ x: 0.5, y: 0.6 }, "Enter"), null);
  });

  it("zooms around the pinch center and clamps the range", () => {
    const start = { x: 0, y: 0, scale: 1 };
    const zoomed = applyPinch(start, { dist: 100, x: 120, y: 80 }, { dist: 200, x: 120, y: 80 }, 120, 80);
    assert.equal(zoomed.scale, 2);
    assert.ok(Math.abs(zoomed.x - (120 - 120 * 2)) < 0.01);
    const capped = applyPinch(zoomed, { dist: 100, x: 0, y: 0 }, { dist: 400, x: 0, y: 0 }, 0, 0);
    assert.equal(capped.scale, 2.5);
    const out = applyPinch({ x: 0, y: 0, scale: 0.7 }, { dist: 100, x: 0, y: 0 }, { dist: 10, x: 0, y: 0 }, 0, 0);
    assert.equal(out.scale, 0.6);
    assert.ok(wheelZoomFactor(100) < 1);
    assert.ok(wheelZoomFactor(-100) > 1);
  });

  it("pans inside the frame and eases zoom without sliding the focus", () => {
    const start = { x: 0, y: 0, scale: 2 };
    assert.equal(panCamera(start, 80, 0, 100, 100, 200, 200).x, 0);
    assert.equal(panCamera(start, -1000, 0, 100, 100, 200, 200).x, 100 - 400);
    const desired = zoomAt(start, 1.25, 40, 50);
    const mid = easeZoom(start, desired, 40, 50, 0.016, false);
    assert.ok(mid.scale > start.scale && mid.scale < desired.scale);
    const held = screenToWorld(40, 50, mid);
    const landed = screenToWorld(40, 50, desired);
    assert.ok(Math.abs(held.x - landed.x) < 0.05);
    assert.ok(Math.abs(held.y - landed.y) < 0.05);
    assert.deepEqual(easeZoom(start, desired, 40, 50, 0.016, true), desired);
  });

  it("does not treat the first 100ms of a pinch as a pan or a walk", () => {
    assert.equal(gestureKind(100, 30, 1), "hold");
    assert.equal(gestureKind(80, 40, 1), "hold");
    assert.equal(gestureKind(140, 30, 1), "pan");
    assert.equal(gestureKind(100, 30, 2), "pinch");
    assert.equal(gestureKind(200, 4, 1), "tap");
    assert.equal(gestureKind(300, 4, 1), "hold");
    assert.equal(walkTargetChanges("tap"), true);
    assert.equal(walkTargetChanges("pan"), false);
    assert.equal(walkTargetChanges("pinch"), false);
    assert.equal(walkTargetChanges("wheel"), false);
    assert.equal(walkTargetChanges("hold"), false);
  });

  it("pauses the loop while the tab is hidden and drops the gap", () => {
    let hidden = false;
    const steps: number[] = [];
    const queue: Array<(time: number) => void> = [];
    const clock = startShellClock(
      (dt) => steps.push(dt),
      () => hidden,
      (cb) => {
        queue.push(cb);
        return queue.length;
      },
      () => undefined,
    );
    queue.shift()?.(0);
    queue.shift()?.(100);
    hidden = true;
    queue.shift()?.(5000);
    hidden = false;
    queue.shift()?.(5100);
    clock.stop();
    assert.ok(steps[1]! <= 0.05);
    assert.ok(steps.at(-1)! <= 0.05);
    assert.ok(!steps.some((dt) => dt > 0.05));
  });

  it("glides another person between snapshot positions", () => {
    const book = emptyRemoteBook();
    const first = stepRemotes(book, [{ id: "a", x: 0.2, y: 0.6 }], 0, 400, 800, false);
    assert.equal(first.get("a")?.x, 0.2);
    stepRemotes(book, [{ id: "a", x: 0.2 + 40 / 400, y: 0.6 }], 500, 400, 800, false);
    const mid = stepRemotes(book, [{ id: "a", x: 0.2 + 40 / 400, y: 0.6 }], 500 + 120, 400, 800, false);
    const x = mid.get("a")?.x ?? 0;
    assert.ok(x > 0.2 && x < 0.2 + 40 / 400);
  });

  it("keeps the six glow levels available on the private-room figure", () => {
    for (const level of [1, 2, 3, 4, 5, 6]) {
      const view = resolveBeDaView({
        snapshot: { ...defaultSnapshot(), isDefault: false, glowLevel: level },
        missedDays: 0,
        sessionHappy: false,
        locale: "vi",
      });
      const art = shellArt(view, null, false);
      assert.ok(art.some((src) => src.includes(`level_${level}`)), art.join(" "));
    }
    const crowd = resolveBeDaView({
      snapshot: { ...defaultSnapshot(), isDefault: false, mood: "happy" },
      missedDays: 0,
      sessionHappy: false,
      locale: "vi",
    });
    const dressed = shellArt(crowd, { outfitId: DEFAULT_GAME_LOOK.outfit, hairId: DEFAULT_GAME_LOOK.hair, clipId: null, pose: null }, true);
    assert.ok(dressed.some((src) => src.includes("/mascot/outfits/outfit_pajamas.svg")));
    assert.ok(dressed.some((src) => src.includes("/mascot/faces/happy/eyes.svg")));
  });

  it("names a room button Vào phòng plus the code", () => {
    const rooms = readRoomList({
      rooms: [{ code: "da7k2m", cap: 8, member_count: 2, joined: true, owner: true }],
    });
    assert.equal(rooms[0]?.code, "DA7K2M");
    assert.equal(rooms[0]?.memberCount, 2);
    assert.equal(rooms[0]?.cap, 8);
    assert.equal(roomEnterLabel("DA7K2M"), "Vào phòng DA7K2M");
    assert.equal(GAME_EMBED_PATH, "/goc-binh-yen/game");
    assert.equal(GAME_SESSION_STORAGE_KEY, "dadiary_access_token");
    assert.equal(hasGameSession("token"), true);
    assert.equal(hasGameSession("  "), false);
  });

  it("does not import React, Pixi, or Next", () => {
    const dir = path.dirname(fileURLToPath(import.meta.url));
    const files = readdirSync(dir).filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"));
    assert.ok(files.length >= 6);
    for (const name of files) {
      const source = readFileSync(path.join(dir, name), "utf8");
      assert.equal(/from ["']react["']/.test(source), false, name);
      assert.equal(/from ["']pixi\.js["']/.test(source), false, name);
      assert.equal(/from ["']next["']|from ["']next\//.test(source), false, name);
    }
  });
});
