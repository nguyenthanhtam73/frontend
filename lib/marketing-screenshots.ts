import { existsSync } from "node:fs";
import path from "node:path";

import "server-only";

/**
 * Optional product screenshots for the marketing home page.
 *
 * Drop files into `frontend/public/marketing/` (see README there). Missing
 * files → CSS mock fallback. Do **not** commit stock photos posed as real users.
 *
 * Resolved once at module load (build / server start). Restart `next dev`
 * after adding files. Serverless runtimes may not see `public/` on disk —
 * SSG/build-time resolution is the supported path.
 */
export const MARKETING_SCREENSHOT_META = {
  heroPhone: {
    file: "hero-phone",
    /** Portrait phone UI. ~9:19.5 — 780×1688 @2x or 390×844. PNG/WebP. */
    width: 780,
    height: 1688,
  },
  solution: {
    file: "solution",
    /** Check-in + coach screen. 4:5 — 1200×1500. PNG/WebP. */
    width: 1200,
    height: 1500,
  },
  preview: [
    { file: "preview-1", width: 800, height: 1000 },
    { file: "preview-2", width: 800, height: 1000 },
    { file: "preview-3", width: 800, height: 1000 },
  ],
} as const;

const PUBLIC_EXTS = ["png", "webp"] as const;

function publicDir(): string {
  return path.join(process.cwd(), "public", "marketing");
}

function publicSrcIfPresent(stem: string): string | undefined {
  const dir = publicDir();
  for (const ext of PUBLIC_EXTS) {
    const fileName = `${stem}.${ext}`;
    if (existsSync(path.join(dir, fileName))) return `/marketing/${fileName}`;
  }
  return undefined;
}

const HERO_PHONE_SRC = publicSrcIfPresent(MARKETING_SCREENSHOT_META.heroPhone.file);
const SOLUTION_SRC = publicSrcIfPresent(MARKETING_SCREENSHOT_META.solution.file);
const PREVIEW_SRCS = MARKETING_SCREENSHOT_META.preview.map((item) =>
  publicSrcIfPresent(item.file),
);

export function resolveHeroPhoneSrc(): string | undefined {
  return HERO_PHONE_SRC;
}

export function resolveSolutionSrc(): string | undefined {
  return SOLUTION_SRC;
}

export function resolvePreviewSrcs(): (string | undefined)[] {
  return PREVIEW_SRCS;
}
