/**
 * Copy backend affiliate_catalog.json → frontend lib/onboarding.
 * Run after catalog sync on the backend so FE soft tips stay in sync.
 *
 *   npm run sync:affiliate-catalog
 */
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(here, "..");
const dest = join(frontendRoot, "lib", "onboarding", "affiliate-catalog.json");

const candidates = [
  resolve(frontendRoot, "..", "backend", "internal", "service", "ai", "affiliate_catalog.json"),
  resolve(frontendRoot, "..", "DaDiary-transfer", "backend", "internal", "service", "ai", "affiliate_catalog.json"),
];

const src = candidates.find((p) => existsSync(p));
if (!src) {
  console.error(
    "Could not find backend affiliate_catalog.json. Looked in:\n" +
      candidates.map((p) => `  - ${p}`).join("\n"),
  );
  process.exit(1);
}

copyFileSync(src, dest);
console.log(`Synced affiliate catalog:\n  ${src}\n→ ${dest}`);
