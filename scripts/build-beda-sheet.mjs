/**
 * Build Pixi spritesheets from the real Bé Da layers.
 * Idle blinks, walk steps the outfit's own legs, wave uses the sleeve arm.
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import playwright from "playwright";

const { chromium } = playwright;

const COLS = 6;
const FW = 176;
const FH = 200;
const CLIPS = [
  { name: "idle", frames: 4 },
  { name: "walk", frames: 6 },
  { name: "wave", frames: 6 },
];
const OUTFITS = [
  "outfit_pajamas",
  "outfit_hoodie",
  "outfit_vay_hoa",
  "outfit_ao_dai",
  "outfit_ao_len",
  "outfit_ao_thun_yem",
  "outfit_ao_thu",
];
const HAIRS = ["hair_sleep_buns", "hair_twin_tails", "hair_short_bob", "hair_high_pony"];

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "public");
const outDir = join(pub, "mascot", "game", "sheets");

function readSvg(rel) {
  const text = readFileSync(join(pub, rel), "utf8");
  return text.replace(/<\?xml[^>]*>/, "").trim();
}

function inner(svg) {
  return svg.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
}

function tags(svg) {
  return inner(svg).match(/<[a-z][\s\S]*?\/>/g) ?? [];
}

function num(tag, attr) {
  const hit = tag.match(new RegExp(`\\b${attr}="([\\d.]+)"`));
  return hit ? Number(hit[1]) : null;
}

function isLeg(tag) {
  const y = num(tag, "y") ?? num(tag, "cy");
  return y != null && y >= 170;
}

function side(tag) {
  const x = num(tag, "x") ?? num(tag, "cx") ?? 110;
  return x < 110 ? "left" : "right";
}

function posedOutfit(outfitId, clip, index) {
  const svg = readSvg(`mascot/outfits/${outfitId}.svg`);
  const swing = clip === "walk" ? Math.sin((index / 6) * Math.PI * 2) : 0;
  const bob = clip === "walk" ? -Math.abs(swing) * 3 : clip === "idle" ? [0, -1.2, -1.6, -1.2][index] ?? 0 : -1;
  const left = { x: swing * 7, y: -Math.max(0, swing) * 9 };
  const right = { x: -swing * 7, y: -Math.max(0, -swing) * 9 };
  const upper = [];
  const legs = { left: [], right: [] };
  for (const tag of tags(svg)) {
    if (isLeg(tag)) legs[side(tag)].push(tag);
    else upper.push(tag);
  }
  const arm = clip === "walk" ? swingArm(-swing * 18) + swingArm(swing * 18, true) : clip === "wave" ? "" : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 250" fill="none">
    <g transform="translate(0 ${bob.toFixed(2)})">${upper.join("")}${arm}</g>
    <g transform="translate(${left.x.toFixed(2)} ${left.y.toFixed(2)})">${legs.left.join("")}</g>
    <g transform="translate(${right.x.toFixed(2)} ${right.y.toFixed(2)})">${legs.right.join("")}</g>
  </svg>`;
}

function swingArm(deg, left = false) {
  const pivot = left ? [82, 156] : [138, 156];
  const tip = left ? -16 : 16;
  return `<g transform="rotate(${deg.toFixed(2)} ${pivot[0]} ${pivot[1]})">
    <path d="M${pivot[0]} ${pivot[1]} q ${tip} 8 ${tip} 24" stroke="#C9967F" stroke-width="11" stroke-linecap="round"/>
    <path d="M${pivot[0]} ${pivot[1]} q ${tip} 8 ${tip} 24" stroke="#FFE4DA" stroke-width="8" stroke-linecap="round"/>
  </g>`;
}

function frameHtml(outfit, hair, clip, index) {
  const bob = clip === "walk" ? -Math.abs(Math.sin((index / 6) * Math.PI * 2)) * 3 : clip === "idle" ? [0, -1.2, -1.6, -1.2][index] ?? 0 : -1;
  const sleeve = outfit.replace(/^outfit_/, "");
  const wave = clip === "wave";
  const wag = wave ? [-10, -2, 8, -2, -10, 4][index] ?? 0 : 0;
  const layers = [
    readSvg("mascot/body/body_chibi_shadow.svg"),
    posedOutfit(outfit, clip, index),
    `<g transform="translate(0 ${bob.toFixed(2)})">${inner(readSvg("mascot/body/body_chibi_head.svg"))}</g>`,
    `<g transform="translate(0 ${bob.toFixed(2)})">${inner(readSvg(`mascot/hair/${hair}.svg`))}</g>`,
    `<g transform="translate(0 ${bob.toFixed(2)})">${inner(readSvg("mascot/faces/happy/cheeks.svg"))}</g>`,
    `<g transform="translate(0 ${bob.toFixed(2)})">${inner(readSvg("mascot/faces/happy/brows.svg"))}</g>`,
    `<g transform="translate(0 ${bob.toFixed(2)})">${inner(readSvg("mascot/faces/happy/eyes.svg"))}</g>`,
    `<g transform="translate(0 ${bob.toFixed(2)})">${inner(readSvg("mascot/faces/happy/mouth.svg"))}</g>`,
  ];
  if (clip === "idle" && index === 2) {
    layers.push(`<g transform="translate(0 ${bob.toFixed(2)})">${inner(readSvg("mascot/fx/eyelids.svg"))}</g>`);
  }
  const arm = wave
    ? `<g transform="rotate(${wag} 138 158)">${inner(readSvg(`mascot/outfits/arm_wave_right__${sleeve}.svg`))}</g>`
    : "";
  return `<div class="frame">${layers
    .map((svg) => svg.replace("<svg ", '<svg class="layer" ').replace(/^<g /, '<svg class="layer" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 250" fill="none"><g ').replace(/<\/g>$/, "</g></svg>"))
    .join("")}${arm ? `<svg class="layer" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 250" fill="none">${arm}</svg>` : ""}</div>`;
}

function sheetHtml(outfit, hair) {
  const cells = [];
  for (const clip of CLIPS) {
    for (let i = 0; i < clip.frames; i += 1) cells.push(frameHtml(outfit, hair, clip.name, i));
    for (let i = clip.frames; i < COLS; i += 1) cells.push(`<div class="frame"></div>`);
  }
  return `<!doctype html><html><head><style>
    html,body{margin:0;background:#0000}
    #sheet{display:grid;grid-template-columns:repeat(${COLS}, ${FW}px);width:${COLS * FW}px;height:${CLIPS.length * FH}px}
    .frame{position:relative;width:${FW}px;height:${FH}px;overflow:hidden}
    .layer{position:absolute;inset:0;width:100%;height:100%}
  </style></head><body><div id="sheet">${cells.join("")}</div></body></html>`;
}

function sheetJson(file) {
  const frames = {};
  const animations = {};
  CLIPS.forEach((clip, row) => {
    const names = [];
    for (let i = 0; i < clip.frames; i += 1) {
      const name = `${clip.name}_${i}`;
      names.push(name);
      frames[name] = {
        frame: { x: i * FW, y: row * FH, w: FW, h: FH },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: FW, h: FH },
        sourceSize: { w: FW, h: FH },
        anchor: { x: 0.5, y: 0.84 },
      };
    }
    animations[clip.name] = names;
  });
  return {
    frames,
    animations,
    meta: { image: file, format: "RGBA8888", size: { w: COLS * FW, h: CLIPS.length * FH }, scale: "1" },
  };
}

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: COLS * FW + 8, height: CLIPS.length * FH + 8 }, deviceScaleFactor: 1 });

for (const outfit of OUTFITS) {
  for (const hair of HAIRS) {
    await page.setContent(sheetHtml(outfit, hair), { waitUntil: "load" });
    const base = `${outfit}__${hair}`;
    const png = await page.locator("#sheet").screenshot({ omitBackground: true });
    writeFileSync(join(outDir, `${base}.png`), png);
    writeFileSync(join(outDir, `${base}.json`), JSON.stringify(sheetJson(`${base}.png`)));
    process.stdout.write(`${base} ${png.length}\n`);
  }
}
await browser.close();
