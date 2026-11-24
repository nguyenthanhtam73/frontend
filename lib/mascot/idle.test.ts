import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { afterEach, describe, it, mock } from "node:test";
import { fileURLToPath } from "node:url";

import { beDaIdleTiming, createBlinkClock, startBeDaBlinkLoop, stepBlinkClock } from "@/lib/mascot/idle";

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../app/globals.css"), "utf8");

describe("Bé Da idle timing", () => {
  it("uses a 3.8s uniform breathe, and 4.8s on glow levels 1–2", () => {
    assert.match(css, /--bd-breath:\s*3\.8s/);
    assert.match(css, /--bd-breath:\s*4\.8s/);
    assert.match(css, /\[data-level="1"\]/);
    assert.match(css, /\[data-level="2"\]/);
    assert.match(css, /translateY\(-0\.5%\)\s+scale\(1\.012\)/);
    assert.match(css, /transform-origin:\s*50%\s+91\.2%/);
    assert.equal(css.includes("scale(1.015, 1.028)"), false);
    assert.equal(css.includes("be-da-breathe"), false);
    assert.equal(css.includes("be-da-blink"), false);
  });

  it("fades eyelids with opacity and keeps fly, yawn, tidy, and the routine jump", () => {
    assert.match(css, /--bd-blink:\s*140ms/);
    assert.equal(css.includes("--bd-blink: 260ms"), false);
    assert.equal(css.includes("--bd-blink: 120ms"), false);
    assert.match(css, /@keyframes bd-blink/);
    assert.equal(css.includes("scaleY"), false);
    assert.match(css, /\.be-da-fly\b/);
    assert.match(css, /\.be-da-yawn\b/);
    assert.match(css, /\.be-da-tidy\b/);
    assert.match(css, /\.be-da-jump\b/);
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
    const reducedStart = css.lastIndexOf("@media (prefers-reduced-motion: reduce)");
    const reduced = css.slice(reducedStart, css.indexOf("@keyframes", reducedStart));
    assert.match(reduced, /\.bd-breathe/);
    assert.match(reduced, /\.bd-lids/);
    assert.match(reduced, /\.be-da-fly/);
    assert.match(reduced, /\.be-da-yawn/);
    assert.match(reduced, /\.be-da-jump/);
    assert.match(reduced, /\.be-da-tidy/);
  });

  it("waits 6–8s, closes for 120–150ms, and uses one timing for sleepy and awake", () => {
    const awake = beDaIdleTiming(3);
    assert.equal(awake.sleepy, false);
    assert.equal(awake.blinkMs(0), 120);
    assert.equal(awake.blinkMs(1), 150);
    assert.equal(awake.waitMs(0), 6000);
    assert.equal(awake.waitMs(1), 8000);
    assert.equal(awake.offsetMs(0), 0);
    assert.equal(awake.offsetMs(1), 8000);

    for (const level of [1, 2]) {
      const sleepy = beDaIdleTiming(level);
      assert.equal(sleepy.sleepy, true);
      assert.equal(sleepy.blinkMs(0), 120);
      assert.equal(sleepy.blinkMs(1), 150);
      assert.equal(sleepy.waitMs(0), 6000);
      assert.equal(sleepy.waitMs(1), 8000);
    }

    assert.equal(beDaIdleTiming(6).sleepy, false);
  });
});

describe("Bé Da blink loop", () => {
  afterEach(() => {
    mock.timers.reset();
  });

  it("blinks once on its own offset, then waits a full 6–8s", () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    const blinks: number[] = [];
    const stop = startBeDaBlinkLoop({
      level: 4,
      reducedMotion: false,
      blink: (ms) => blinks.push(ms),
      random: scripted([0, 0.5, 1, 0]),
    });
    mock.timers.tick(0);
    assert.deepEqual(blinks, [135]);
    mock.timers.tick(7739);
    assert.deepEqual(blinks, [135]);
    mock.timers.tick(261);
    assert.equal(blinks.length, 2);
    assert.equal(blinks[1], 120);
    stop();
  });

  it("uses the same 6s gap on levels 1 and 2", () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    const blinks: number[] = [];
    const stop = startBeDaBlinkLoop({
      level: 2,
      reducedMotion: false,
      blink: () => blinks.push(1),
      random: scripted([0, 0, 0]),
    });
    mock.timers.tick(0);
    assert.equal(blinks.length, 1);
    mock.timers.tick(5999);
    assert.equal(blinks.length, 1);
    mock.timers.tick(1);
    assert.equal(blinks.length, 2);
    stop();
  });

  it("does not blink two clocks on the same beat", () => {
    const early = createBlinkClock(0);
    const late = createBlinkClock(1);
    assert.ok(stepBlinkClock(early, 16, () => 0, false) > 0);
    assert.equal(stepBlinkClock(late, 16, () => 0, false), 0);
    assert.ok(late.waitLeft > 7000);
    assert.equal(stepBlinkClock(early, 20, () => 0, true), 0);
    assert.equal(early.active, 0);
  });

  it("does not schedule when reduced motion is on", () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    let blinks = 0;
    const stop = startBeDaBlinkLoop({
      level: 1,
      reducedMotion: true,
      blink: () => {
        blinks += 1;
      },
      random: () => 0,
    });
    mock.timers.tick(20_000);
    assert.equal(blinks, 0);
    stop();
  });

  it("clears the pending blink and the double blink on stop", () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    let blinks = 0;
    const stop = startBeDaBlinkLoop({
      level: 1,
      reducedMotion: false,
      blink: () => {
        blinks += 1;
      },
      random: scripted([0, 0, 0]),
    });
    mock.timers.tick(3000);
    assert.equal(blinks, 1);
    stop();
    mock.timers.tick(10_000);
    assert.equal(blinks, 1);
  });
});

function scripted(values: number[]): () => number {
  let index = 0;
  return () => {
    const next = values[index] ?? 0.99;
    index += 1;
    return next;
  };
}
