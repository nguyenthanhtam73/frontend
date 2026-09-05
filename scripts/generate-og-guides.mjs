#!/usr/bin/env node
/**
 * Per-guide Open Graph images (1200×630).
 *
 *   npm run og:guides
 *
 * Writes `public/og/guides/{slug}.svg` + `{slug}.png`.
 * Metadata points at the PNG (`guideOgPath()`). If `sharp` is missing,
 * this script still writes unique SVGs and prints how to generate PNGs.
 *
 * Requires `sharp` for PNG (`npm i -D sharp` if `npm run og:default` fails).
 * Keep 1200×630. Do not invent user photos or fake reviews on these cards.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(__dirname, "../public/og/guides");

const WIDTH = 1200;
const HEIGHT = 630;

const GUIDES = [
  {
    slug: "da-dau",
    kicker: "Da dầu · nóng ẩm",
    title: "Routine mỏng, SPF mỗi sáng",
    accent: "#2A8F88",
    wash: "#E8F5F3",
  },
  {
    slug: "mun",
    kicker: "Mụn ẩn · mụn viêm",
    title: "Dịu da trước khi thêm acid",
    accent: "#C45C74",
    wash: "#F8E8EC",
  },
  {
    slug: "kem-chong-nang",
    kicker: "Kem chống nắng",
    title: "Thoa đủ để giữ được",
    accent: "#C48A2A",
    wash: "#F8F0DC",
  },
  {
    slug: "routine-cham-da",
    kicker: "Routine người mới",
    title: "3–4 bước, dễ giữ hơn 10",
    accent: "#3B7A5A",
    wash: "#E7F3EA",
  },
  {
    slug: "tham-mun",
    kicker: "Thâm mụn · nóng ẩm",
    title: "SPF, kiên nhẫn, không chà",
    accent: "#7A5A8A",
    wash: "#F1E8F4",
  },
  {
    slug: "da-dau-van-phong",
    kicker: "Da dầu văn phòng",
    title: "Máy lạnh: mỏng, đừng rửa thêm",
    accent: "#3D6B8A",
    wash: "#E6F0F5",
  },
  {
    slug: "da-kho",
    kicker: "Da khô · nóng ẩm",
    title: "Dưỡng khi ẩm, đừng rửa kít",
    accent: "#B8864A",
    wash: "#F6EDE0",
  },
  {
    slug: "da-nhay-cam",
    kicker: "Da nhạy cảm",
    title: "Giảm kích, một thay đổi",
    accent: "#6A8A7A",
    wash: "#E8F2EC",
  },
  {
    slug: "retinol-cho-nguoi-moi",
    kicker: "Retinol người mới",
    title: "Chậm, SPF, dừng khi rát",
    accent: "#7A5A8A",
    wash: "#F1E8F4",
  },
  {
    slug: "da-nong-am",
    kicker: "Da nóng ẩm · Việt Nam",
    title: "Chín guide, rồi chụp ảnh",
    accent: "#2A8F88",
    wash: "#E8F5F3",
  },
];

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function guideSvg({ kicker, title, accent, wash }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="DaDiary">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${WIDTH}" y2="${HEIGHT}" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${wash}"/>
      <stop offset="55%" stop-color="#9DD7D4"/>
      <stop offset="100%" stop-color="#F4C7CE"/>
    </linearGradient>
    <linearGradient id="tile" x1="0" y1="0" x2="96" y2="96" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="${accent}"/>
      <stop offset="100%" stop-color="#E8A4B0"/>
    </linearGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="18" flood-color="#0F2E2C" flood-opacity="0.12"/>
    </filter>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  <circle cx="1060" cy="70" r="260" fill="#FFFFFF" opacity="0.22"/>
  <circle cx="90" cy="560" r="200" fill="#FFFFFF" opacity="0.16"/>
  <rect x="88" y="96" width="1024" height="438" rx="36" fill="#FFFFFF" opacity="0.62" filter="url(#soft)"/>
  <g transform="translate(128 148)">
    <rect width="96" height="96" rx="28" fill="url(#tile)"/>
    <path d="M32 66V42a8 8 0 0 1 8-8h12a8 8 0 0 1 8 8v4M66 56v2a8 8 0 0 1-8 8H44"
      fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="68" cy="44" r="4" fill="#FFFFFF"/>
  </g>
  <text x="248" y="188" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif"
    font-size="28" font-weight="700" fill="#0F2E2C">DaDiary</text>
  <text x="248" y="226" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif"
    font-size="20" font-weight="600" fill="${accent}">${escapeXml(kicker)}</text>
  <text x="128" y="340" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif"
    font-size="48" font-weight="700" fill="#0F2E2C">${escapeXml(title)}</text>
  <text x="128" y="400" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif"
    font-size="24" font-weight="500" fill="#2A5552">Hướng dẫn chăm da · chụp ảnh nhận routine</text>
  <text x="128" y="456" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif"
    font-size="20" font-weight="500" fill="#2A5552" opacity="0.85">Không thay thế bác sĩ da liễu</text>
</svg>
`;
}

mkdirSync(OUT_DIR, { recursive: true });

let sharp = null;
try {
  sharp = require("sharp");
} catch {
  console.warn("sharp not installed — wrote SVGs only. Run `npm i -D sharp` then `npm run og:guides` for PNGs.");
}

for (const guide of GUIDES) {
  const svg = guideSvg(guide);
  const svgPath = resolve(OUT_DIR, `${guide.slug}.svg`);
  writeFileSync(svgPath, svg, "utf8");
  console.log(`Wrote ${svgPath}`);

  if (!sharp) continue;
  const pngPath = resolve(OUT_DIR, `${guide.slug}.png`);
  await sharp(Buffer.from(svg)).resize(WIDTH, HEIGHT).png({ compressionLevel: 9 }).toFile(pngPath);
  console.log(`Wrote ${pngPath}`);
}
