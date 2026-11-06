import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_GAME_LOOK } from "@/lib/mascot/game/look";
import { emptyRemoteBook, stepRemotes } from "@/lib/mascot/game/shell/actors";
import { shellArt } from "@/lib/mascot/game/shell/art";
import { cappedDpr, MAX_DPR } from "@/lib/mascot/game/shell/dpr";
import { arrowGoal, pointerKind } from "@/lib/mascot/game/shell/input";
import { startShellClock } from "@/lib/mascot/game/shell/loop";
import { defaultSnapshot, resolveBeDaView } from "@/lib/mascot/model";

describe("pixi shell", () => {
  it("caps the framebuffer at 2", () => {
    assert.equal(MAX_DPR, 2);
    assert.equal(cappedDpr(3), 2);
    assert.equal(cappedDpr(1.5), 1.5);
    assert.equal(cappedDpr(0), 1);
  });

  it("treats a short press as a tap and a slide as a drag", () => {
    assert.equal(pointerKind(4), "tap");
    assert.equal(pointerKind(24), "drag");
    assert.deepEqual(arrowGoal({ x: 0.5, y: 0.6 }, "ArrowLeft"), { x: 0.44, y: 0.6 });
    assert.equal(arrowGoal({ x: 0.5, y: 0.6 }, "Enter"), null);
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
});
