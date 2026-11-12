import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { describe, it } from "node:test";

import { CHIN_ARM, HANG_ARM, IDLE_ARM_LEFT, armMarkup, armPose, sleeveArmSrc, withoutChinHand } from "./sheet-arms";

/** Face fill on body_chibi. The sleeve hand uses this same paint. */
const FACE_SKIN = { r: 255, g: 228, b: 218 };
const SHEET_COUNT = 31;

type Rgba = { w: number; h: number; px: Uint8Array };

function decodePng(buf: Buffer): Rgba {
  if (buf.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error("png");
  let w = 0;
  let h = 0;
  const idat: Buffer[] = [];
  let pos = 8;
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    pos += 12 + len;
    if (type === "IHDR") {
      w = data.readUInt32BE(0);
      h = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) throw new Error("expected RGBA png");
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
  }
  const raw = inflateSync(Buffer.concat(idat));
  const stride = w * 4;
  const px = new Uint8Array(stride * h);
  const row = new Uint8Array(stride);
  const prev = new Uint8Array(stride);
  let src = 0;
  for (let y = 0; y < h; y += 1) {
    const filter = raw[src];
    src += 1;
    row.set(raw.subarray(src, src + stride));
    src += stride;
    for (let i = 0; i < stride; i += 1) {
      const left = i >= 4 ? row[i - 4] : 0;
      const up = prev[i] ?? 0;
      const ul = i >= 4 ? prev[i - 4] ?? 0 : 0;
      if (filter === 1) row[i] = (row[i]! + left) & 255;
      else if (filter === 2) row[i] = (row[i]! + up) & 255;
      else if (filter === 3) row[i] = (row[i]! + ((left + up) >> 1)) & 255;
      else if (filter === 4) {
        const p = left + up - ul;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - ul);
        const pr = pa <= pb && pa <= pc ? left : pb <= pc ? up : ul;
        row[i] = (row[i]! + pr) & 255;
      }
    }
    px.set(row, y * stride);
    prev.set(row);
  }
  return { w, h, px };
}

function isFaceSkin(px: Uint8Array, i: number): boolean {
  const r = px[i] ?? 0;
  const g = px[i + 1] ?? 0;
  const b = px[i + 2] ?? 0;
  const a = px[i + 3] ?? 0;
  return a >= 180 && Math.abs(r - FACE_SKIN.r) < 28 && Math.abs(g - FACE_SKIN.g) < 28 && Math.abs(b - FACE_SKIN.b) < 32 && r > g && g >= b - 8;
}

type HandBlob = { n: number; x: number; y: number };

/** Hands are skin outside the face and the legs. Ears are smaller than a hand. */
function handBlobs(image: Rgba, frame: { x: number; y: number; w: number; h: number }): HandBlob[] {
  const { px, w } = image;
  const seen = new Uint8Array(frame.w * frame.h);
  const blobs: HandBlob[] = [];
  const stack: number[] = [];
  for (let y = 0; y < frame.h; y += 1) {
    for (let x = 0; x < frame.w; x += 1) {
      const local = y * frame.w + x;
      if (seen[local]) continue;
      const i = ((frame.y + y) * w + (frame.x + x)) * 4;
      if (!isFaceSkin(px, i) || inFaceOrLeg(x, y)) continue;
      let n = 0;
      let sx = 0;
      let sy = 0;
      stack.push(local);
      seen[local] = 1;
      while (stack.length) {
        const at = stack.pop() ?? 0;
        const ax = at % frame.w;
        const ay = (at / frame.w) | 0;
        n += 1;
        sx += ax;
        sy += ay;
        const neighbors = [at - 1, at + 1, at - frame.w, at + frame.w];
        for (const next of neighbors) {
          if (next < 0 || next >= seen.length || seen[next]) continue;
          const nx = next % frame.w;
          const ny = (next / frame.w) | 0;
          if (Math.abs(nx - ax) + Math.abs(ny - ay) !== 1) continue;
          const ni = ((frame.y + ny) * w + (frame.x + nx)) * 4;
          if (!isFaceSkin(px, ni) || inFaceOrLeg(nx, ny)) continue;
          seen[next] = 1;
          stack.push(next);
        }
      }
      if (n >= 60) blobs.push({ n, x: sx / n / 2, y: sy / n / 2 });
    }
  }
  return blobs;
}

function inFaceOrLeg(x: number, y: number): boolean {
  const cx = x / 2 - 110;
  const cy = y / 2 - 104;
  if (cx * cx + cy * cy < 42 * 42) return true;
  const cssX = x / 2;
  const cssY = y / 2;
  return cssY > 168 && cssX > 75 && cssX < 145;
}

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

  it("rests one hand at the chin, swings the walk, and raises one arm to wave", () => {
    const idle = armPose("idle", 0);
    assert.equal(idle.left, CHIN_ARM);
    assert.equal(idle.left, IDLE_ARM_LEFT);
    assert.equal(idle.right, HANG_ARM);
    const step = armPose("walk", 1);
    const back = armPose("walk", 4);
    assert.ok(step.right < HANG_ARM && step.right < back.right);
    assert.ok(step.left > HANG_ARM && step.left > back.left);
    assert.ok(step.left > CHIN_ARM);
    const wave = armPose("wave", 2);
    assert.ok(Math.abs(wave.right) < 20);
    assert.equal(wave.left, HANG_ARM);
  });

  it("drops the loose chest hand from the glow plate", () => {
    const svg = readFileSync(new URL("../../../public/mascot/glow/level_1.svg", import.meta.url), "utf8");
    const next = withoutChinHand(svg);
    assert.equal(next.includes("M77 150"), false);
    assert.match(next, /M100 62/);
    assert.match(next, /M88 158/);
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

  it("paints the hand with the same skin as the face", () => {
    const body = readFileSync(new URL("../../../public/mascot/body/body_chibi.svg", import.meta.url), "utf8");
    assert.match(body, /circle cx="110" cy="104"[^>]*fill="#FFE4DA"/);
    const sleeves = readdirSync(new URL("../../../public/mascot/outfits", import.meta.url)).filter((name) =>
      name.startsWith("arm_wave_right__"),
    );
    assert.ok(sleeves.length >= 7);
    for (const name of sleeves) {
      const svg = readFileSync(new URL(`../../../public/mascot/outfits/${name}`, import.meta.url), "utf8");
      assert.match(svg, /circle cx="164" cy="128"[^>]*fill="#FFE4DA"/, name);
    }
  });

  it("gives every frame exactly two hands outside the face", () => {
    const dir = new URL("../../../public/mascot/game/sheets/", import.meta.url);
    const sheets = readdirSync(dir).filter((name) => name.endsWith(".png")).sort();
    assert.equal(sheets.length, SHEET_COUNT);
    for (const name of sheets) {
      const json = JSON.parse(readFileSync(new URL(`${name.replace(/\.png$/, "")}.json`, dir), "utf8")) as {
        animations: Record<string, string[]>;
        frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
      };
      assert.equal(json.animations.idle?.length, 4, name);
      assert.equal(json.animations.walk?.length, 6, name);
      assert.equal(json.animations.wave?.length, 6, name);
      const image = decodePng(readFileSync(new URL(name, dir)));
      for (const clip of ["idle", "walk", "wave"] as const) {
        for (const frameName of json.animations[clip] ?? []) {
          const frame = json.frames[frameName]?.frame;
          assert.ok(frame, frameName);
          const hands = handBlobs(image, frame).filter((hand) => hand.y >= 120);
          assert.equal(
            hands.length,
            2,
            `${name} ${frameName} ${hands.map((hand) => `${hand.n}@${hand.x.toFixed(0)},${hand.y.toFixed(0)}`).join(" ")}`,
          );
          const high = [...hands].sort((a, b) => a.y - b.y)[0];
          const low = [...hands].sort((a, b) => b.y - a.y)[0];
          if (clip === "idle") assert.ok(high && low && high.y < 150 && high.y < low.y - 15, frameName);
          if (clip === "walk") {
            assert.ok(hands.every((hand) => hand.y > 165), frameName);
            assert.ok(Math.min(...hands.map((hand) => hand.x)) < 100, frameName);
            assert.ok(Math.max(...hands.map((hand) => hand.x)) > 140, frameName);
          }
          if (clip === "wave") assert.ok(high && low && high.x > 140 && low.x < 100 && high.y < low.y - 20, frameName);
        }
      }
    }
  });

  it("keeps other outfits a different color from the default pajamas dress", () => {
    const dir = new URL("../../../public/mascot/game/sheets/", import.meta.url);
    const sheets = readdirSync(dir).filter((name) => name.endsWith(".png")).sort();
    const byOutfit = new Map<string, string>();
    for (const name of sheets) {
      const outfit = name.split("__")[0] ?? "";
      if (!byOutfit.has(outfit)) byOutfit.set(outfit, name);
    }
    const colors = [...byOutfit.entries()].map(([outfit, name]) => ({
      outfit,
      color: dressColor(decodePng(readFileSync(new URL(name, dir)))),
    }));
    const pajamas = colors.find((item) => item.outfit === "outfit_pajamas");
    assert.ok(pajamas);
    assert.ok(pajamas.color.r > 220 && pajamas.color.b > 180 && pajamas.color.r - pajamas.color.g > 30);
    const others = colors.filter((item) => item.outfit !== "outfit_pajamas");
    assert.ok(others.length >= 5);
    for (const item of others) {
      const distance = Math.hypot(item.color.r - pajamas.color.r, item.color.g - pajamas.color.g, item.color.b - pajamas.color.b);
      assert.ok(distance > 40, `${item.outfit} matches the default dress (${distance.toFixed(0)})`);
    }
  });
});

function dressColor(image: Rgba): { r: number; g: number; b: number } {
  const bins = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let y = 310; y < 360; y += 1) {
    for (let x = 180; x < 290; x += 1) {
      const i = (y * image.w + x) * 4;
      const r = image.px[i] ?? 0;
      const g = image.px[i + 1] ?? 0;
      const b = image.px[i + 2] ?? 0;
      const a = image.px[i + 3] ?? 0;
      if (a < 200) continue;
      if (r > 230 && g > 200 && b > 190) continue;
      if (Math.abs(r - 201) < 30 && Math.abs(g - 150) < 30 && Math.abs(b - 127) < 30) continue;
      const key = `${r >> 4},${g >> 4},${b >> 4}`;
      const bin = bins.get(key) ?? { n: 0, r: 0, g: 0, b: 0 };
      bin.n += 1;
      bin.r += r;
      bin.g += g;
      bin.b += b;
      bins.set(key, bin);
    }
  }
  let best = { n: 0, r: 0, g: 0, b: 0 };
  for (const bin of bins.values()) if (bin.n > best.n) best = bin;
  assert.ok(best.n > 0);
  return { r: best.r / best.n, g: best.g / best.n, b: best.b / best.n };
}
