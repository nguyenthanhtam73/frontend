#!/usr/bin/env node
/**
 * Generate PWA icon PNGs and iOS splash screens with no external
 * dependencies. The artwork is a placeholder that matches the DaDiary brand
 * palette (soft teal → baby pink gradient with a centered drop glyph).
 *
 * Re-run after updating the brand or adding a new device size:
 *   node scripts/generate-pwa-icons.mjs
 *
 * Outputs:
 *   public/icons/icon-{192,512,maskable-512}.png
 *   public/apple-touch-icon.png
 *   public/splash/<name>.png  (one per iOS device class)
 *   lib/pwa-splash.ts         (typed list of <link> entries)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ICONS_OUT = resolve(ROOT, "public/icons");
const SPLASH_OUT = resolve(ROOT, "public/splash");
const APPLE_OUT = resolve(ROOT, "public/apple-touch-icon.png");
const SPLASH_TS_OUT = resolve(ROOT, "lib/pwa-splash.ts");

// Brand palette — keep aligned with app/globals.css and components/site/logo.tsx.
const BG_TOP = hex("#9DD7D4");      // soft teal tint
const BG_BOTTOM = hex("#F4C7CE");   // baby pink wash
const GLYPH = hex("#FFFFFF");       // white glyph for contrast on gradient
const SAFE = hex("#0F2B33");        // deep ink for fallback / shadows
// Splash background uses a slightly washed cream so the glyph reads softer
// when the launch image fills the entire screen.
const SPLASH_TOP = hex("#E8F5F3");
const SPLASH_BOTTOM = hex("#FAEDEF");

function hex(s) {
  const v = s.replace("#", "");
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

// CRC32 table for PNG chunks (RFC 2083).
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

/**
 * Render a PNG of the given dimensions using a single per-pixel `paint`
 * callback. `paint(x, y)` returns an `[r, g, b, a]` tuple (0-255).
 */
function renderPng(width, height, paint) {
  const bytesPerPixel = 4; // RGBA
  const rows = [];
  for (let y = 0; y < height; y++) {
    const row = Buffer.alloc(width * bytesPerPixel + 1);
    row[0] = 0; // filter type: None
    for (let x = 0; x < width; x++) {
      const px = paint(x, y);
      const off = 1 + x * bytesPerPixel;
      row[off] = px[0];
      row[off + 1] = px[1];
      row[off + 2] = px[2];
      row[off + 3] = px[3];
    }
    rows.push(row);
  }
  const idat = deflateSync(Buffer.concat(rows), { level: 9 });

  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // colour type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ---------- icons -----------------------------------------------------------

/**
 * `safeRatio` controls how much of the canvas the artwork occupies; for
 * maskable icons the OS may crop up to ~20% on each side, so we shrink the
 * artwork into the safe zone and fill the rest with a solid brand colour.
 */
function renderIcon({ size, maskable = false }) {
  const safeRatio = maskable ? 0.78 : 1;
  const cornerRatio = maskable ? 0 : 0.22;
  const inset = (size * (1 - safeRatio)) / 2;
  const artSize = size - inset * 2;
  const radius = artSize * cornerRatio;
  return renderPng(size, size, (x, y) =>
    paintIconPixel(x, y, { size, inset, artSize, radius, maskable }),
  );
}

function paintIconPixel(x, y, ctx) {
  const { size, inset, artSize, radius, maskable } = ctx;

  const inSafeZone =
    x >= inset && x < size - inset && y >= inset && y < size - inset;
  if (!inSafeZone) {
    return maskable ? [...BG_TOP, 255] : [0, 0, 0, 0];
  }

  const localX = x - inset;
  const localY = y - inset;
  const u = localX / artSize;
  const v = localY / artSize;

  let bgAlpha = 255;
  if (radius > 0) {
    bgAlpha = roundedRectAlpha(localX, localY, artSize, artSize, radius);
    if (bgAlpha === 0) return [0, 0, 0, 0];
  }

  const t = clamp((u + v) / 2, 0, 1);
  const highlight = Math.max(0, 1 - v * 1.6) * 0.12;
  const bg = mix(BG_TOP, BG_BOTTOM, t).map((c) => clamp(c + highlight * 255, 0, 255));

  const drop = inDrop(localX, localY, artSize);
  if (drop.inside) {
    const shadow = clamp((localY - drop.cy) / drop.r, 0, 1) * 0.18;
    return [...mix(GLYPH, SAFE, shadow), bgAlpha];
  }
  return [...bg, bgAlpha];
}

// ---------- splash ----------------------------------------------------------

/**
 * Splash screens fill the device viewport at launch. Brand background gradient
 * with the drop glyph centered horizontally and slightly above center so the
 * iOS home indicator doesn't overlap it.
 */
function renderSplash({ width, height }) {
  const minDim = Math.min(width, height);
  const glyphSize = Math.round(minDim * 0.32);
  const glyphX = Math.round((width - glyphSize) / 2);
  const glyphY = Math.round((height - glyphSize) / 2 - height * 0.05);

  return renderPng(width, height, (x, y) => {
    // Soft diagonal gradient cream → blush across the entire viewport.
    const t = clamp((x / width + y / height) / 2, 0, 1);
    const bg = mix(SPLASH_TOP, SPLASH_BOTTOM, t);

    const localX = x - glyphX;
    const localY = y - glyphY;
    if (localX < 0 || localX >= glyphSize || localY < 0 || localY >= glyphSize) {
      return [...bg, 255];
    }

    const drop = inDrop(localX, localY, glyphSize);
    if (!drop.inside) return [...bg, 255];

    // The splash glyph uses brand teal-pink fill so it pops on the cream
    // background instead of disappearing into white.
    const tt = clamp((localX + localY) / (2 * glyphSize), 0, 1);
    const shadow = clamp((localY - drop.cy) / drop.r, 0, 1) * 0.15;
    const fill = mix(BG_TOP, BG_BOTTOM, tt).map((c) =>
      clamp(c - shadow * 80, 0, 255),
    );
    return [...fill, 255];
  });
}

/**
 * Returns whether `(localX, localY)` falls inside the canonical drop
 * silhouette scaled into a square of side `artSize`. Shared between icon
 * and splash renderers.
 */
function inDrop(localX, localY, artSize) {
  const cx = artSize / 2;
  const cy = artSize * 0.6;
  const r = artSize * 0.22;
  const dx = localX - cx;
  const dy = localY - cy;
  const inBody = dx * dx + dy * dy <= r * r;

  const tipHeight = artSize * 0.32;
  const tipHalf = r * 0.85;
  const tipBaseY = cy - r * 0.4;
  const tipApexY = cy - r - tipHeight * 0.5;
  const tipNormX = Math.abs(dx) / tipHalf;
  const tipNormY = (tipBaseY - localY) / (tipBaseY - tipApexY);
  const inTip = tipNormY >= 0 && tipNormY <= 1 && tipNormX <= 1 - tipNormY;

  return { inside: inBody || inTip, cx, cy, r };
}

function roundedRectAlpha(x, y, w, h, r) {
  const inLeft = x < r;
  const inRight = x >= w - r;
  const inTop = y < r;
  const inBottom = y >= h - r;
  if ((inLeft || inRight) && (inTop || inBottom)) {
    const cx = inLeft ? r : w - r;
    const cy = inTop ? r : h - r;
    const dx = x - cx + 0.5;
    const dy = y - cy + 0.5;
    return dx * dx + dy * dy <= r * r ? 255 : 0;
  }
  return 255;
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function clamp(n, lo, hi) {
  return n < lo ? lo : n > hi ? hi : n;
}

function write(path, buf) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buf);
  console.log(`  ✓ ${path}  (${(buf.length / 1024).toFixed(1)} KB)`);
}

// ---------- iOS device matrix ----------------------------------------------

/**
 * Apple-required physical-pixel sizes for `apple-touch-startup-image`.
 * `dw`/`dh` are CSS-pixel viewport dimensions used in the `media` query and
 * `dpr` is `-webkit-device-pixel-ratio`. Sourced from the Apple HIG /
 * web.dev iOS splash screen guide. We ship portrait-only — the manifest is
 * `orientation: portrait` so landscape splash screens are unnecessary noise.
 */
const SPLASH_DEVICES = [
  // iPhone 15 Pro Max / 14 Pro Max
  { name: "iphone-15-pro-max",  w: 1290, h: 2796, dw: 430, dh: 932, dpr: 3 },
  // iPhone 14 Plus / 13 Pro Max / 12 Pro Max
  { name: "iphone-14-plus",     w: 1284, h: 2778, dw: 428, dh: 926, dpr: 3 },
  // iPhone 15 Pro / 14 Pro
  { name: "iphone-15-pro",      w: 1179, h: 2556, dw: 393, dh: 852, dpr: 3 },
  // iPhone 14 / 13 / 13 Pro / 12 / 12 Pro
  { name: "iphone-14",          w: 1170, h: 2532, dw: 390, dh: 844, dpr: 3 },
  // iPhone 13 mini / 12 mini / 11 Pro / XS / X
  { name: "iphone-x",           w: 1125, h: 2436, dw: 375, dh: 812, dpr: 3 },
  // iPhone 11 Pro Max / XS Max
  { name: "iphone-xs-max",      w: 1242, h: 2688, dw: 414, dh: 896, dpr: 3 },
  // iPhone 11 / XR
  { name: "iphone-xr",          w:  828, h: 1792, dw: 414, dh: 896, dpr: 2 },
  // iPhone 8 Plus / 7 Plus / 6s Plus
  { name: "iphone-8-plus",      w: 1242, h: 2208, dw: 414, dh: 736, dpr: 3 },
  // iPhone SE 2/3, 8, 7, 6s
  { name: "iphone-8",           w:  750, h: 1334, dw: 375, dh: 667, dpr: 2 },
  // iPad Pro 12.9"
  { name: "ipad-pro-12",        w: 2048, h: 2732, dw: 1024, dh: 1366, dpr: 2 },
  // iPad Pro 11"
  { name: "ipad-pro-11",        w: 1668, h: 2388, dw: 834, dh: 1194, dpr: 2 },
  // iPad Air 10.9"
  { name: "ipad-air",           w: 1640, h: 2360, dw: 820, dh: 1180, dpr: 2 },
  // Standard iPad / iPad mini
  { name: "ipad",               w: 1536, h: 2048, dw: 768, dh: 1024, dpr: 2 },
];

function mediaQuery(d) {
  return `(device-width: ${d.dw}px) and (device-height: ${d.dh}px) and (-webkit-device-pixel-ratio: ${d.dpr}) and (orientation: portrait)`;
}

function writeSplashTs(devices) {
  const banner =
    "// AUTO-GENERATED by scripts/generate-pwa-icons.mjs — do not edit by hand.\n" +
    "// Re-run the script after changing splash sizes.\n\n";
  const entries = devices.map((d) => {
    const url = `/splash/${d.name}.png`;
    return `  { url: "${url}", media: "${mediaQuery(d)}" }`;
  });
  const body =
    `export type SplashLink = { url: string; media: string };\n\n` +
    `export const PWA_SPLASH_LINKS: readonly SplashLink[] = [\n${entries.join(",\n")},\n];\n`;
  writeFileSync(SPLASH_TS_OUT, banner + body);
  console.log(`  ✓ ${SPLASH_TS_OUT}  (${devices.length} entries)`);
}

// ---------- run -------------------------------------------------------------

console.log("Generating DaDiary PWA icons…");
write(resolve(ICONS_OUT, "icon-192.png"), renderIcon({ size: 192 }));
write(resolve(ICONS_OUT, "icon-512.png"), renderIcon({ size: 512 }));
write(resolve(ICONS_OUT, "icon-maskable-512.png"), renderIcon({ size: 512, maskable: true }));
write(APPLE_OUT, renderIcon({ size: 180 }));

console.log("Generating iOS splash screens…");
for (const d of SPLASH_DEVICES) {
  write(resolve(SPLASH_OUT, `${d.name}.png`), renderSplash({ width: d.w, height: d.h }));
}

writeSplashTs(SPLASH_DEVICES);

console.log("Done.");
