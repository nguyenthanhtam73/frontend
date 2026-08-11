#!/usr/bin/env node
/**
 * Generate the default Open Graph image (1200×630).
 *
 *   npm run og:default
 *
 * Output: public/og/og-default.png (+ SVG source)
 * Replace the PNG with a designed asset anytime — keep 1200×630.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../public/og");
const OUT_PNG = resolve(OUT_DIR, "og-default.png");
const OUT_SVG = resolve(OUT_DIR, "og-default.svg");

const WIDTH = 1200;
const HEIGHT = 630;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="DaDiary">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${WIDTH}" y2="${HEIGHT}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#E8F5F3"/>
      <stop offset="45%" stop-color="#9DD7D4"/>
      <stop offset="100%" stop-color="#F4C7CE"/>
    </linearGradient>
    <linearGradient id="tile" x1="0" y1="0" x2="112" y2="112" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#7EC4C1"/>
      <stop offset="100%" stop-color="#E8A4B0"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="#0F2E2C" flood-opacity="0.12"/>
    </filter>
  </defs>

  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <circle cx="1060" cy="70" r="260" fill="#FFFFFF" opacity="0.22"/>
  <circle cx="90" cy="560" r="200" fill="#FFFFFF" opacity="0.16"/>
  <circle cx="980" cy="520" r="120" fill="#FFFFFF" opacity="0.12"/>

  <!-- Soft card panel -->
  <rect x="120" y="110" width="960" height="410" rx="36" fill="#FFFFFF" opacity="0.55" filter="url(#soft)"/>

  <!-- Brand tile -->
  <g transform="translate(544 150)">
    <rect width="112" height="112" rx="32" fill="url(#tile)"/>
    <path d="M38 76V48a10 10 0 0 1 10-10h14a10 10 0 0 1 10 10v5M78 64V66a10 10 0 0 1-10 10H52"
      fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="80" cy="52" r="5" fill="#FFFFFF"/>
  </g>

  <text x="600" y="330" text-anchor="middle"
    font-family="Segoe UI, Helvetica Neue, Arial, sans-serif"
    font-size="78" font-weight="700" fill="#0F2E2C">DaDiary</text>
  <text x="600" y="390" text-anchor="middle"
    font-family="Segoe UI, Helvetica Neue, Arial, sans-serif"
    font-size="34" font-weight="550" fill="#1A3D3A">Nhật ký da + AI Coach</text>
  <text x="600" y="448" text-anchor="middle"
    font-family="Segoe UI, Helvetica Neue, Arial, sans-serif"
    font-size="22" font-weight="500" fill="#2A5552" opacity="0.85">Check-in ảnh · Streak · Gợi ý chăm da mỗi ngày</text>
</svg>
`;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT_SVG, svg, "utf8");

await sharp(Buffer.from(svg))
  .resize(WIDTH, HEIGHT)
  .png({ compressionLevel: 9 })
  .toFile(OUT_PNG);

console.log(`Wrote ${OUT_PNG}`);
console.log(`Wrote ${OUT_SVG}`);
