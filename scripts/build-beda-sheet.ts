/**
 * Raster idle / walk / wave sheets from the real SVG layers.
 * Nothing is redrawn: each frame is the same stack the DOM figure paints.
 */
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import playwright from "playwright";

import { lookArt } from "@/lib/game/core/art";
import { armMarkup } from "@/lib/mascot/game/sheet-arms";
import { SHEET_CSS, SHEET_DPR, sheetKeyFromArt } from "@/lib/mascot/game/actor-sheet";
import { DEFAULT_GAME_LOOK } from "@/lib/mascot/game/look";
import { SAMPLE_LOBBY_FRIENDS, sampleFriendView } from "@/lib/mascot/game/lobby";
import { gameRoomView } from "@/lib/mascot/game/room-view";
import { sampleSpaGuests } from "@/lib/mascot/game/spa-room";
import { defaultSnapshot, resolveBeDaView } from "@/lib/mascot/model";

const { chromium } = playwright;
const COLS = 6;
const CLIPS = [
  { name: "idle", frames: 4 },
  { name: "walk", frames: 6 },
  { name: "wave", frames: 6 },
] as const;

const outDir = join(process.cwd(), "public", "mascot", "game", "sheets");

function arts(): Map<string, readonly string[]> {
  const found = new Map<string, readonly string[]>();
  const add = (art: readonly string[]) => {
    found.set(sheetKeyFromArt(art), art);
  };
  const home = gameRoomView(
    resolveBeDaView({ snapshot: defaultSnapshot(), missedDays: 0, sessionHappy: false, locale: "vi" }),
  );
  add(lookArt(home, DEFAULT_GAME_LOOK, false));
  add(lookArt(home, DEFAULT_GAME_LOOK, true));
  for (const friend of SAMPLE_LOBBY_FRIENDS) {
    add(lookArt(sampleFriendView(friend), { outfit: friend.outfit, hair: friend.hair, clip: friend.clip }, true));
  }
  for (const guest of sampleSpaGuests(new Set())) {
    const sample = SAMPLE_LOBBY_FRIENDS.find((friend) => friend.id === guest.id);
    if (!sample) continue;
    add(
      lookArt(sampleFriendView(sample), { outfit: guest.outfit, hair: guest.hair, clip: guest.clip }, true),
    );
  }
  return found;
}

function layersHtml(art: readonly string[]): string {
  return art
    .map((src) => `<img alt="" src="${src}">`)
    .join("");
}

function outfitSrc(art: readonly string[]): string {
  return art.find((src) => src.includes("/outfits/outfit_")) ?? "/mascot/outfits/outfit_pajamas.svg";
}

function frameHtml(art: readonly string[], clip: "idle" | "walk" | "wave", index: number): string {
  const stack = layersHtml(art);
  const arms = armMarkup(outfitSrc(art), clip, index);
  if (clip === "idle") {
    const blink = index === 2 ? `<img alt="" src="/mascot/fx/eyelids.svg">` : "";
    return `<div class="frame"><div class="stack">${stack}${blink}</div>${arms}</div>`;
  }
  if (clip === "wave") {
    return `<div class="frame"><div class="stack">${stack}</div>${arms}</div>`;
  }
  const swing = Math.sin((index / 6) * Math.PI * 2);
  const bob = -Math.abs(swing) * 2.2;
  const liftL = -Math.max(0, swing) * 6;
  const liftR = -Math.max(0, -swing) * 6;
  const slide = (swing * 4).toFixed(2);
  return `<div class="frame">
    <div class="stack shadow">${stack}</div>
    <div class="mover" style="transform:translate(${slide}px, ${liftL.toFixed(2)}px)"><div class="stack leg-l">${stack}</div></div>
    <div class="mover" style="transform:translate(${(-swing * 4).toFixed(2)}px, ${liftR.toFixed(2)}px)"><div class="stack leg-r">${stack}</div></div>
    <div class="mover" style="transform:translateY(${bob.toFixed(2)}px)"><div class="stack upper">${stack}</div></div>
    <div class="mover" style="transform:translateY(${bob.toFixed(2)}px)">${arms}</div>
  </div>`;
}

const base = process.env.BASE_URL ?? "http://localhost:3000";

function sheetHtml(art: readonly string[]): string {
  const cells: string[] = [];
  for (const clip of CLIPS) {
    for (let i = 0; i < clip.frames; i += 1) cells.push(frameHtml(art, clip.name, i));
    for (let i = clip.frames; i < COLS; i += 1) cells.push(`<div class="frame"></div>`);
  }
  const w = COLS * SHEET_CSS.w;
  const h = CLIPS.length * SHEET_CSS.h;
  return `<!doctype html><html><head><base href="${base}/"><style>
    html,body{margin:0;background:transparent}
    #sheet{display:grid;grid-template-columns:repeat(${COLS}, ${SHEET_CSS.w}px);width:${w}px;height:${h}px}
    .frame{position:relative;width:${SHEET_CSS.w}px;height:${SHEET_CSS.h}px;overflow:hidden}
    .mover,.stack{position:absolute;inset:0}
    .stack img,.arm{position:absolute;inset:0;width:100%;height:100%}
    .leg-l{clip-path:inset(70% 50% 10% 0)}
    .leg-r{clip-path:inset(70% 0 10% 50%)}
    .upper{clip-path:inset(0 0 26% 0)}
    .shadow{clip-path:inset(88% 0 0 0)}
    .arm{transform-origin:62.7% 63.2%}
    .arm-mirror{position:absolute;inset:0;transform:scaleX(-1)}
  </style></head><body><div id="sheet">${cells.join("")}</div></body></html>`;
}

function sheetJson(file: string) {
  const fw = SHEET_CSS.w * SHEET_DPR;
  const fh = SHEET_CSS.h * SHEET_DPR;
  const frames: Record<string, unknown> = {};
  const animations: Record<string, string[]> = {};
  CLIPS.forEach((clip, row) => {
    const names: string[] = [];
    for (let i = 0; i < clip.frames; i += 1) {
      const name = `${clip.name}_${i}`;
      names.push(name);
      frames[name] = {
        frame: { x: i * fw, y: row * fh, w: fw, h: fh },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: fw, h: fh },
        sourceSize: { w: fw, h: fh },
        anchor: { x: 0.5, y: 1 },
      };
    }
    animations[clip.name] = names;
  });
  return {
    frames,
    animations,
    meta: {
      image: file,
      format: "RGBA8888",
      size: { w: COLS * fw, h: CLIPS.length * fh },
      scale: "1",
    },
  };
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  for (const name of readdirSync(outDir)) rmSync(join(outDir, name));

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: COLS * SHEET_CSS.w + 8, height: CLIPS.length * SHEET_CSS.h + 8 },
    deviceScaleFactor: SHEET_DPR,
  });
  for (const [key, art] of arts()) {
    await page.setContent(sheetHtml(art), { waitUntil: "networkidle" });
    const png = await page.locator("#sheet").screenshot({ omitBackground: true });
    writeFileSync(join(outDir, `${key}.png`), png);
    writeFileSync(join(outDir, `${key}.json`), JSON.stringify(sheetJson(`${key}.png`)));
    process.stdout.write(`${key} ${png.length}\n`);
  }
  await browser.close();
}

void main();
