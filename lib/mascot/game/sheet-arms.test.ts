import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { describe, it } from "node:test";

import { IDLE_ARM_LEFT, IDLE_ARM_RIGHT, armMarkup, armPose, sleeveArmSrc } from "./sheet-arms";

/** Face fill on body_chibi. The sleeve hand uses this same paint. */
const FACE_SKIN = { r: 255, g: 228, b: 218 };
const SHEET_COUNT = 31;
const HAND_PIXELS = 200;

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

type HandCount = { left: number; right: number; leftY: number; rightY: number };

/** Skin pixels of a hand beside the body. The head, ears, and legs sit outside these boxes. */
function countHands(image: Rgba, frame: { x: number; y: number; w: number; h: number }, clip: string): HandCount {
  let left = 0;
  let right = 0;
  let leftY = 0;
  let rightY = 0;
  const { px, w } = image;
  for (let y = 0; y < frame.h; y += 1) {
    for (let x = 0; x < frame.w; x += 1) {
      const i = ((frame.y + y) * w + (frame.x + x)) * 4;
      if (!isFaceSkin(px, i)) continue;
      const lowLeft = x < 164 && y > 310 && y < 430;
      const lowRight = x > 296 && y > 320 && y < 430;
      const raised = x > 300 && y > 232 && y < 300;
      if (lowLeft) {
        left += 1;
        leftY += y;
      } else if (clip === "wave" ? raised : lowRight) {
        right += 1;
        rightY += y;
      }
    }
  }
  return {
    left,
    right,
    leftY: left ? leftY / left : 0,
    rightY: right ? rightY / right : 0,
  };
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

  it("gives every idle, walk, and wave frame two face-colored hands", () => {
    const dir = new URL("../../../public/mascot/game/sheets/", import.meta.url);
    const sheets = readdirSync(dir).filter((name) => name.endsWith(".png")).sort();
    assert.equal(sheets.length, SHEET_COUNT);
    let swing: { step: HandCount; back: HandCount; idle: HandCount; wave: HandCount } | null = null;
    for (const name of sheets) {
      const json = JSON.parse(readFileSync(new URL(`${name.replace(/\.png$/, "")}.json`, dir), "utf8")) as {
        animations: Record<string, string[]>;
        frames: Record<string, { frame: { x: number; y: number; w: number; h: number } }>;
      };
      assert.deepEqual(json.animations.idle?.length, 4, name);
      assert.deepEqual(json.animations.walk?.length, 6, name);
      assert.deepEqual(json.animations.wave?.length, 6, name);
      const image = decodePng(readFileSync(new URL(name, dir)));
      for (const clip of ["idle", "walk", "wave"] as const) {
        json.animations[clip]?.forEach((frameName, index) => {
          const frame = json.frames[frameName]?.frame;
          assert.ok(frame, frameName);
          const hands = countHands(image, frame, clip);
          assert.ok(hands.left >= HAND_PIXELS, `${name} ${frameName} left ${hands.left}`);
          assert.ok(hands.right >= HAND_PIXELS, `${name} ${frameName} right ${hands.right}`);
          if (name.includes("pajamas__hair_sleep_buns") && swing == null && index === 0 && clip === "idle") {
            swing = {
              idle: hands,
              step: countHands(image, json.frames.walk_1!.frame, "walk"),
              back: countHands(image, json.frames.walk_4!.frame, "walk"),
              wave: countHands(image, json.frames.wave_2!.frame, "wave"),
            };
          }
        });
      }
    }
    assert.ok(swing);
    const posed = swing as { step: HandCount; back: HandCount; idle: HandCount; wave: HandCount };
    assert.ok(posed.step.rightY < posed.back.rightY);
    assert.ok(posed.step.leftY > posed.back.leftY);
    assert.ok(posed.wave.rightY < posed.idle.rightY - 40);
  });
});
