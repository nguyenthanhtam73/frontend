#!/usr/bin/env node
import sharp from "sharp";
import { copyFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const brand = resolve(root, "public/brand");
mkdirSync(brand, { recursive: true });

const glyph = readFileSync(resolve(brand, "dadiary-logo.svg"));
for (const size of [256, 512, 1024]) {
  const out = resolve(brand, `dadiary-logo-${size}.png`);
  await sharp(glyph, { density: Math.round((size / 32) * 72) })
    .resize(size, size)
    .png()
    .toFile(out);
  console.log(`  ✓ ${out}`);
}

// Wordmark viewBox is 180×40 (4.5:1).
const wordmark = readFileSync(resolve(brand, "dadiary-logo-wordmark.svg"));
for (const height of [128, 256, 512]) {
  const width = Math.round(height * (180 / 40));
  const out = resolve(brand, `dadiary-logo-wordmark-${height}.png`);
  await sharp(wordmark, { density: Math.round((height / 40) * 72) })
    .resize(width, height)
    .png()
    .toFile(out);
  console.log(`  ✓ ${out}`);
}

copyFileSync(
  resolve(root, "public/icons/icon-512.png"),
  resolve(brand, "dadiary-logo-512-pwa.png"),
);
console.log("Done.");
