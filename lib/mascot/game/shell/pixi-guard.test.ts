import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  actorSheetPlan,
  setActorReady,
  createShellLife,
  destroyShellLife,
  notePixiInitFailed,
  scheduleRecenterResume,
  attachIfMounted,
  createPixiStartGate,
  createFrameWatch,
} from "./pixi-guard";

describe("pixi shell lifetime", () => {
  it("does not let a missing sheet block the other Bé Das", () => {
    assert.equal(actorSheetPlan({ ready: false, failed: true, busy: false }), "fallback");
    assert.equal(actorSheetPlan({ ready: false, failed: false, busy: true }), "wait");
    assert.equal(actorSheetPlan({ ready: false, failed: false, busy: false }), "start");
    assert.equal(actorSheetPlan({ ready: true, failed: true, busy: true }), "draw");
  });

  it("puts the spritesheet flag back on a remounted Bé Da every frame", () => {
    const remounted: { actorReady?: string } = {};
    setActorReady(remounted, true);
    assert.equal(remounted.actorReady, "1");
    delete remounted.actorReady;
    setActorReady(remounted, true);
    assert.equal(remounted.actorReady, "1");
  });

  it("shows the HTML figure while a new hair or outfit sheet loads", () => {
    const worn: { actorReady?: string } = { actorReady: "1" };
    setActorReady(worn, false);
    assert.equal(worn.actorReady, undefined);
  });

  it("reapplies the ready flag on the draw path and clears it when a look starts loading", () => {
    const source = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "pixi-actors.ts"), "utf8");
    const draw = source.indexOf("if (!have) return;");
    const drawFlag = source.indexOf("setActorReady(el.dataset, true)", draw);
    assert.ok(draw >= 0 && drawFlag > draw && drawFlag < draw + 80);
    const start = source.indexOf('if (plan === "start")');
    const clear = source.indexOf("setActorReady(el.dataset, false)", start);
    assert.ok(start >= 0 && clear > start && clear < start + 80);
  });

  it("does not attach a sheet that loads after destroy", () => {
    const life = createShellLife();
    const attached: string[] = [];
    assert.equal(attachIfMounted(life, "sheet", (value) => attached.push(value)), true);
    destroyShellLife(life, () => undefined);
    assert.equal(attachIfMounted(life, "late", (value) => attached.push(value)), false);
    assert.deepEqual(attached, ["sheet"]);
  });

  it("clears the recenter timer on destroy and does not resume follow", () => {
    const life = createShellLife();
    const timers = new Map<number, () => void>();
    let next = 1;
    let resumed = false;
    let cleared = 0;
    scheduleRecenterResume(
      life,
      460,
      () => {
        resumed = true;
      },
      (fn) => {
        const id = next;
        next += 1;
        timers.set(id, fn);
        return id;
      },
      (id) => {
        cleared = id;
        timers.delete(id);
      },
    );
    const pending = life.recenterTimer;
    assert.equal(pending, 1);
    destroyShellLife(life, (id) => {
      cleared = id;
      timers.delete(id);
    });
    assert.equal(life.destroyed, true);
    assert.equal(life.recenterTimer, 0);
    assert.equal(cleared, pending);
    assert.equal(timers.has(pending), false);
    assert.equal(resumed, false);
  });

  it("clears the loading flag when Pixi init fails and still reports the fallback", () => {
    const dataset: { loading?: string } = { loading: "1" };
    let failed = 0;
    notePixiInitFailed(dataset, false, () => {
      failed += 1;
    });
    assert.equal(dataset.loading, undefined);
    assert.equal(failed, 1);
    const gone: { loading?: string } = { loading: "1" };
    notePixiInitFailed(gone, true, () => {
      failed += 1;
    });
    assert.equal(gone.loading, undefined);
    assert.equal(failed, 1);
  });

  it("keeps the room canvas above the floor when she stands at the back", () => {
    const css = readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../../components/mascot/game/be-da-game.css"),
      "utf8",
    );
    const rule = css.match(/data-depth="back"\] \.beda-pixi-host \{[^}]*z-index:\s*(\d+)/);
    assert.equal(rule?.[1], "1");
  });

  it("calls onError once when the shell is late, and ignores that resolve", () => {
    const gate = createPixiStartGate();
    const errors: string[] = [];
    const destroyed: string[] = [];
    let dead = false;
    const destroy = () => destroyed.push("canvas");
    if (gate.claim()) {
      dead = true;
      destroy();
      errors.push("error");
    }
    const handle = { destroy: () => destroyed.push("stage") };
    if (dead || !gate.claim()) handle.destroy();
    else errors.push("ready");
    assert.deepEqual(errors, ["error"]);
    assert.deepEqual(destroyed, ["canvas", "stage"]);
    assert.equal(gate.claim(), false);
  });

  it("keeps the watchdog armed after init until a frame is confirmed", () => {
    const watch = createFrameWatch();
    watch.noteInit();
    assert.equal(watch.inited, true);
    assert.equal(watch.armed, true);
    assert.equal(watch.noteFrame(), true);
    assert.equal(watch.armed, false);
    assert.equal(watch.noteFrame(), false);
  });

  it("treats a lost WebGL context as the DOM fallback and ignores a late frame", () => {
    const watch = createFrameWatch();
    const destroyed: string[] = [];
    watch.noteInit();
    const handle = { destroy: () => destroyed.push("app") };
    assert.equal(watch.armed, true);
    assert.equal(watch.fail(true), true);
    handle.destroy();
    assert.equal(watch.noteFrame(), false);
    assert.equal(watch.fail(true), false);
    assert.deepEqual(destroyed, ["app"]);
  });

  it("lets a ready shell win and ignores the timeout", () => {
    const gate = createPixiStartGate();
    assert.equal(gate.claim(), true);
    assert.equal(gate.claim(), false);
  });

  it("does not draw a second shadow ellipse on top of the sheet", () => {
    const source = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "pixi-actors.ts"), "utf8");
    assert.equal(source.includes("new Graphics"), false);
    assert.equal(source.includes(".ellipse("), false);
  });
});
