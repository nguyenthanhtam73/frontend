#!/usr/bin/env node
/**
 * Generate PWA icon PNGs and iOS splash screens with no external
 * dependencies. Artwork matches components/site/logo.tsx (rounded gradient
 * tile with the journal glyph).
 *
 * Re-run after updating the brand or adding a new device size:
 *   node scripts/generate-pwa-icons.mjs
 *
 * Outputs:
 *   public/icons/icon-{192,512,maskable-512}.png
 *   public/favicon-{16,32}.png
 *   public/favicon.ico
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
  const inset = (size * (1 - safeRatio)) / 2;
  const artSize = size - inset * 2;
  return renderPng(size, size, (x, y) => paintIconPixel(x, y, { size, inset, artSize, maskable }));
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
  const t = clamp(((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy), 0, 1);
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/** Matches components/site/logo.tsx glyph in a square canvas. */
function paintLogoGlyph(localX, localY, artSize) {
  const pad = artSize * (1 / 32);
  const box = artSize - pad * 2;
  const radius = box * (9 / 30);
  const lx = localX - pad;
  const ly = localY - pad;

  if (lx < 0 || ly < 0 || lx >= box || ly >= box) return null;

  const alpha = roundedRectAlpha(lx, ly, box, box, radius);
  if (alpha === 0) return null;

  const u = lx / box;
  const v = ly / box;
  const t = clamp((u + v) / 2, 0, 1);
  const bg = mix(BG_TOP, BG_BOTTOM, t);

  const s = box / 30;
  const ox = pad + s;
  const oy = pad + s;

  const dotCx = ox + 22 * s;
  const dotCy = oy + 14 * s;
  const dotR = 1.4 * s;
  if (Math.hypot(localX - dotCx, localY - dotCy) <= dotR + 0.5) {
    return [...GLYPH, 255];
  }

  const stroke = 2 * s;
  const half = stroke / 2;
  const segments = [
    [ox + 11 * s, oy + 21 * s, ox + 11 * s, oy + 13 * s],
    [ox + 11 * s, oy + 13 * s, ox + 14 * s, oy + 10 * s],
    [ox + 14 * s, oy + 10 * s, ox + 18 * s, oy + 10 * s],
    [ox + 18 * s, oy + 10 * s, ox + 21 * s, oy + 13 * s],
    [ox + 21 * s, oy + 13 * s, ox + 21 * s, oy + 14.5 * s],
    [ox + 21 * s, oy + 17.5 * s, ox + 21 * s, oy + 19 * s],
    [ox + 21 * s, oy + 19 * s, ox + 18 * s, oy + 22 * s],
    [ox + 18 * s, oy + 22 * s, ox + 14 * s, oy + 22 * s],
  ];

  for (const [x1, y1, x2, y2] of segments) {
    if (distToSegment(localX, localY, x1, y1, x2, y2) <= half + 0.6) {
      return [...GLYPH, 255];
    }
  }

  return [...bg, alpha];
}

function paintIconPixel(x, y, ctx) {
  const { size, inset, artSize, maskable } = ctx;

  const inSafeZone =
    x >= inset && x < size - inset && y >= inset && y < size - inset;
  if (!inSafeZone) {
    return maskable ? [...BG_TOP, 255] : [0, 0, 0, 0];
  }

  const glyph = paintLogoGlyph(x - inset, y - inset, artSize);
  return glyph ?? [0, 0, 0, 0];
}

// ---------- splash ----------------------------------------------------------

/**
 * Splash screens fill the device viewport at launch. Brand background gradient
 * with the logo glyph centered horizontally and slightly above center so the
 * iOS home indicator doesn't overlap it.
 */
function renderSplash({ width, height }) {
  const minDim = Math.min(width, height);
  const glyphSize = Math.round(minDim * 0.32);
  const glyphX = Math.round((width - glyphSize) / 2);
  const glyphY = Math.round((height - glyphSize) / 2 - height * 0.05);

  return renderPng(width, height, (x, y) => {
    const t = clamp((x / width + y / height) / 2, 0, 1);
    const bg = mix(SPLASH_TOP, SPLASH_BOTTOM, t);

    const localX = x - glyphX;
    const localY = y - glyphY;
    if (localX < 0 || localX >= glyphSize || localY < 0 || localY >= glyphSize) {
      return [...bg, 255];
    }

    const glyph = paintLogoGlyph(localX, localY, glyphSize);
    return glyph ?? [...bg, 255];
  });
}

/** Wrap a 32×32 PNG in a minimal ICO container (PNG-in-ICO, Vista+). */
function pngToIco(pngBuf) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry[0] = 32;
  entry[1] = 32;
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuf.length, 8);
  entry.writeUInt32LE(22, 12);

  return Buffer.concat([header, entry, pngBuf]);
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

const favicon32 = renderIcon({ size: 32 });
write(resolve(ROOT, "public/favicon-32.png"), favicon32);
write(resolve(ROOT, "public/favicon-16.png"), renderIcon({ size: 16 }));
write(resolve(ROOT, "public/favicon.ico"), pngToIco(favicon32));

console.log("Generating iOS splash screens…");
for (const d of SPLASH_DEVICES) {
  write(resolve(SPLASH_OUT, `${d.name}.png`), renderSplash({ width: d.w, height: d.h }));
}

writeSplashTs(SPLASH_DEVICES);

console.log("Done.");
