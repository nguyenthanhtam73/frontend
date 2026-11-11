import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { IDLE_ARM_LEFT, IDLE_ARM_RIGHT, armMarkup, armPose, sleeveArmSrc } from "./sheet-arms";

describe("sheet arms", () => {
  it("uses the outfit sleeve file, not a new drawing", () => {
    assert.equal(sleeveArmSrc("/mascot/outfits/outfit_hoodie.svg"), "/mascot/outfits/arm_wave_right__hoodie.svg");
    assert.equal(sleeveArmSrc("/mascot/outfits/outfit_ao_dai.svg"), "/mascot/outfits/arm_wave_right__ao_dai.svg");
  });

  it("puts both arms on idle, walk, and wave frames", () => {
    for (const clip of ["idle", "walk", "wave"] as const) {
      const html = armMarkup("/mascot/outfits/outfit_pajamas.svg", clip, clip === "walk" ? 1 : 0);
      const src = "/mascot/outfits/arm_wave_right__pajamas.svg";
      assert.equal(html.split(src).length - 1, 2, clip);
      assert.match(html, /arm-r/);
      assert.match(html, /arm-l/);
    }
  });

  it("swings the arms opposite the legs and raises one arm to wave", () => {
    const idle = armPose("idle", 0);
    assert.equal(idle.right, IDLE_ARM_RIGHT);
    assert.equal(idle.left, IDLE_ARM_LEFT);
    const step = armPose("walk", 1);
    assert.ok(step.right < idle.right);
    assert.ok(step.left > idle.left);
    const back = armPose("walk", 4);
    assert.ok(back.right > idle.right);
    assert.ok(back.left < idle.left);
    const wave = armPose("wave", 2);
    assert.ok(Math.abs(wave.right) < 20);
    assert.equal(wave.left, IDLE_ARM_LEFT);
  });

  it("keeps the sleeve layers outside the walk clip in the sheet capture", () => {
    const src = readFileSync(new URL("../../../scripts/build-beda-sheet.ts", import.meta.url), "utf8");
    assert.equal(src.split("${arms}").length - 1, 3);
    assert.match(src, /\.arm-mirror\{[^}]*scaleX\(-1\)/);
    const walk = src.slice(src.indexOf("const swing"), src.indexOf("const base"));
    const upper = walk.indexOf('class="stack upper"');
    const upperClose = walk.indexOf("</div></div>", upper);
    const arms = walk.lastIndexOf("${arms}");
    assert.ok(upper >= 0 && upperClose > upper && arms > upperClose);
  });
});
