import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { afterEach, describe, it, mock } from "node:test";
import { fileURLToPath } from "node:url";

import { beDaIdleTiming, startBeDaBlinkLoop } from "@/lib/mascot/idle";

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
    assert.match(css, /--bd-blink:\s*120ms/);
    assert.match(css, /--bd-blink:\s*260ms/);
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

  it("waits 2.5–6s with an 18% double blink, and 3–6s / 8% when sleepy", () => {
    const awake = beDaIdleTiming(3);
    assert.equal(awake.sleepy, false);
    assert.equal(awake.blinkMs, 120);
    assert.equal(awake.waitMs(0), 2500);
    assert.equal(awake.waitMs(1), 6000);
    assert.equal(awake.doubleBlinkGapMs(0), 260);
    assert.equal(awake.doubleBlinkGapMs(0.179), 260);
    assert.equal(awake.doubleBlinkGapMs(0.18), null);

    for (const level of [1, 2]) {
      const sleepy = beDaIdleTiming(level);
      assert.equal(sleepy.sleepy, true);
      assert.equal(sleepy.blinkMs, 260);
      assert.equal(sleepy.waitMs(0), 3000);
      assert.equal(sleepy.waitMs(1), 6000);
      assert.equal(sleepy.doubleBlinkGapMs(0.079), 420);
      assert.equal(sleepy.doubleBlinkGapMs(0.08), null);
    }

    assert.equal(beDaIdleTiming(6).sleepy, false);
  });
});

describe("Bé Da blink loop", () => {
  afterEach(() => {
    mock.timers.reset();
  });

  it("blinks, then double-blinks, on the awake schedule", () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    const blinks: number[] = [];
    const stop = startBeDaBlinkLoop({
      level: 4,
      reducedMotion: false,
      blink: () => blinks.push(blinks.length + 1),
      random: scripted([0, 0, 0]),
    });
    mock.timers.tick(2499);
    assert.deepEqual(blinks, []);
    mock.timers.tick(1);
    assert.deepEqual(blinks, [1]);
    mock.timers.tick(259);
    assert.deepEqual(blinks, [1]);
    mock.timers.tick(1);
    assert.deepEqual(blinks, [1, 2]);
    stop();
  });

  it("uses the sleepy gap on levels 1 and 2", () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    const blinks: number[] = [];
    const stop = startBeDaBlinkLoop({
      level: 2,
      reducedMotion: false,
      blink: () => blinks.push(1),
      random: scripted([0, 0]),
    });
    mock.timers.tick(2999);
    assert.equal(blinks.length, 0);
    mock.timers.tick(1);
    assert.equal(blinks.length, 1);
    mock.timers.tick(419);
    assert.equal(blinks.length, 1);
    mock.timers.tick(1);
    assert.equal(blinks.length, 2);
    stop();
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
