import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  createShellLife,
  destroyShellLife,
  notePixiInitFailed,
  scheduleRecenterResume,
  attachIfMounted,
} from "./pixi-guard";

describe("pixi shell lifetime", () => {
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

  it("does not draw a second shadow ellipse on top of the sheet", () => {
    const source = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "pixi-actors.ts"), "utf8");
    assert.equal(source.includes("new Graphics"), false);
    assert.equal(source.includes(".ellipse("), false);
  });
});
