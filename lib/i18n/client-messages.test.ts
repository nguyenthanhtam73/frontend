import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { ALL_CLIENT_MESSAGE_NAMESPACES } from "./client-messages";
import vi from "../../messages/vi.json";

const USE_TRANSLATIONS_RE = /useTranslations\(\s*["']([A-Za-z][\w]*)["']/g;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCAN_DIRS = ["app", "components", "lib", "hooks"].map((d) => path.join(ROOT, d));

function walkTsFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTsFiles(full, out);
    else if (/\.(tsx|ts)$/.test(entry.name) && !entry.name.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

function collectUseTranslationNamespaces(): Map<string, string[]> {
  const allowed = new Set<string>(ALL_CLIENT_MESSAGE_NAMESPACES);
  const missing = new Map<string, string[]>();

  for (const dir of SCAN_DIRS) {
    for (const file of walkTsFiles(dir)) {
      const source = fs.readFileSync(file, "utf8");
      let match: RegExpExecArray | null;
      USE_TRANSLATIONS_RE.lastIndex = 0;
      while ((match = USE_TRANSLATIONS_RE.exec(source))) {
        const ns = match[1]!.split(".")[0]!;
        if (allowed.has(ns)) continue;
        const rel = path.relative(ROOT, file).replace(/\\/g, "/");
        const list = missing.get(ns) ?? [];
        if (!list.includes(rel)) list.push(rel);
        missing.set(ns, list);
      }
    }
  }

  return missing;
}

describe("client message namespaces", () => {
  it("covers every useTranslations root namespace in a pick list", () => {
    const missing = collectUseTranslationNamespaces();
    if (missing.size === 0) return;

    const lines = [...missing.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([ns, files]) => {
        const where = files.slice(0, 5).join(", ");
        const more = files.length > 5 ? ` (+${files.length - 5} more)` : "";
        return `- ${ns}: add to the right *MESSAGE_NAMESPACES in lib/i18n/client-messages.ts (used in ${where}${more})`;
      });

    assert.fail(
      `Missing client i18n pick-list entries:\n${lines.join("\n")}\n\n` +
        `Shell → SHELL_MESSAGE_NAMESPACES; home → HOME_; pricing/payment → PRICING_/PAYMENT_; ` +
        `share → SHARE_; authenticated app → APP_CLIENT_MESSAGE_NAMESPACES.`,
    );
  });
});

const VOICE_ROOTS = [
  "checkIn.coach",
  "checkIn.feedbackLoading",
  "checkIn.maintenance",
  "checkIn.routineBridge",
  "checkIn.beforeAfterShare",
  "checkIn.pushNudge",
  "coachWelcome",
] as const;

/** Standalone slang. Word boundaries so a longer word is not flagged. */
const PROFANITY = [
  "đm",
  "đcm",
  "dcm",
  "dkm",
  "đkm",
  "đmm",
  "vl",
  "vcl",
  "vkl",
  "vcc",
  "clgt",
  "cmm",
  "cmn",
  "cmnr",
  "địt",
  "đụ",
  "đéo",
  "lồn",
  "cặc",
  "buồi",
  "cứt",
  "vãi",
];

function collectStrings(value: unknown, prefix: string, out: { path: string; text: string }[]) {
  if (typeof value === "string") {
    out.push({ path: prefix, text: value });
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    collectStrings(child, prefix ? `${prefix}.${key}` : key, out);
  }
}

function at(root: unknown, dotted: string): unknown {
  return dotted.split(".").reduce<unknown>((cur, key) => {
    if (!cur || typeof cur !== "object") return undefined;
    return (cur as Record<string, unknown>)[key];
  }, root);
}

describe("result and starter-routine voice", () => {
  const lines = VOICE_ROOTS.flatMap((root) => {
    const found: { path: string; text: string }[] = [];
    collectStrings(at(vi, root), root, found);
    return found;
  });

  it("has no profanity in Vietnamese result or starter-routine copy", () => {
    const pattern = new RegExp(
      `(?<![\\p{L}\\p{N}])(?:${PROFANITY.join("|")})(?![\\p{L}\\p{N}])`,
      "iu",
    );
    const hits = lines.filter((line) => pattern.test(line.text));
    assert.deepEqual(
      hits.map((line) => `${line.path}: ${line.text}`),
      [],
    );
  });

  it("does not claim a streak or progress chart in static copy", () => {
    const hits = lines.filter((line) => /streak|tiến trình/i.test(line.text));
    assert.deepEqual(
      hits.map((line) => `${line.path}: ${line.text}`),
      [],
    );
  });
});

/** Jargon that is never a product name we can keep. */
const ALWAYS_BANNED: RegExp[] = [/hàng rào/iu, /hạ kích/iu, /purging/iu, /\bbarrier\b/iu];

/** An ingredient may stay when a plain explanation sits next to it. */
const INGREDIENT_NAME =
  /\b(?:ceramides?|niacinamide|retinoids?|retinol|BHA|AHA|PHA)\b/giu;

function ingredientHasExplanation(text: string, index: number, length: number): boolean {
  const after = text.slice(index + length);
  const before = text.slice(0, index);
  if (/^\s*\([^)]{6,}\)/.test(after)) return true;
  if (/^\s*[—–]\s+\S.{5,}/.test(after)) return true;
  if (/^\s*:\s+\S.{5,}/.test(after)) return true;
  if (/\([^)]{6,}\)\s*$/.test(before)) return true;
  return false;
}

export function unexplainedJargon(text: string): string[] {
  const hits: string[] = [];
  for (const pattern of ALWAYS_BANNED) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) hits.push(`/${pattern.source}/`);
  }
  for (const match of text.matchAll(INGREDIENT_NAME)) {
    const index = match.index ?? 0;
    if (!ingredientHasExplanation(text, index, match[0].length)) {
      hits.push(match[0]);
    }
  }
  return hits;
}

const VI_LETTER = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

const COPY_SOURCES = [
  "lib/onboarding/personalize-step-tip.ts",
  "lib/onboarding/guest-starter.ts",
  "lib/stores/onboarding-store.ts",
  "lib/affiliate/why-copy.ts",
];

function collectJsonStrings(value: unknown, prefix: string, out: { path: string; text: string }[]) {
  if (typeof value === "string") {
    out.push({ path: prefix, text: value });
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    collectJsonStrings(child, prefix ? `${prefix}.${key}` : key, out);
  }
}

function quotedVietnamese(source: string): string[] {
  const out: string[] = [];
  const re = /"([^"\\]*(?:\\.[^"\\]*)*)"/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source))) {
    const text = match[1]!.replace(/\\n/g, "\n");
    if (VI_LETTER.test(text)) out.push(text);
  }
  return out;
}

describe("everyday Vietnamese", () => {
  it("keeps jargon out of vi UI copy and the product-tip catalog", () => {
    const lines: { path: string; text: string }[] = [];
    collectJsonStrings(
      JSON.parse(fs.readFileSync(path.join(ROOT, "messages/vi.json"), "utf8")),
      "messages/vi.json",
      lines,
    );
    const catalog = JSON.parse(
      fs.readFileSync(path.join(ROOT, "lib/onboarding/affiliate-catalog.json"), "utf8"),
    ) as { id?: string; reason_template?: string }[];
    for (const item of catalog) {
      if (item.reason_template) {
        lines.push({
          path: `affiliate-catalog.json ${item.id ?? ""} reason_template`,
          text: item.reason_template,
        });
      }
    }
    for (const rel of COPY_SOURCES) {
      const source = fs.readFileSync(path.join(ROOT, rel), "utf8");
      for (const text of quotedVietnamese(source)) {
        lines.push({ path: rel, text });
      }
    }

    const hits = lines.flatMap((line) =>
      unexplainedJargon(line.text).map((hit) => `${line.path}: ${hit} in “${line.text}”`),
    );
    assert.deepEqual(hits, []);
  });

  it("allows an ingredient name when a plain explanation sits next to it", () => {
    assert.deepEqual(unexplainedJargon("ceramide (giúp lớp ngoài da giữ nước, đỡ khô rát)"), []);
    assert.deepEqual(unexplainedJargon("BHA — chất làm sạch lỗ chân lông"), []);
    assert.deepEqual(unexplainedJargon("niacinamide: giúp da đều màu hơn"), []);
    assert.ok(unexplainedJargon("thoa niacinamide mỗi tối").includes("niacinamide"));
    assert.ok(unexplainedJargon("Hàng rào da đang yếu").some((hit) => hit.includes("hàng rào")));
  });

  it("counts the progress trend in lần soi, not an English pts unit", () => {
    const messages = JSON.parse(fs.readFileSync(path.join(ROOT, "messages/vi.json"), "utf8")) as {
      progress: { summary: { sparklineCount: string } };
    };
    const enMessages = JSON.parse(fs.readFileSync(path.join(ROOT, "messages/en.json"), "utf8")) as {
      progress: { summary: { sparklineCount: string } };
    };
    assert.equal(messages.progress.summary.sparklineCount, "{n} lần soi da có ảnh");
    assert.equal(/\bpts\b/i.test(messages.progress.summary.sparklineCount), false);
    assert.equal(enMessages.progress.summary.sparklineCount, "{n} pts");
    const card = fs.readFileSync(
      path.join(ROOT, "components/progress/progress-summary-card.tsx"),
      "utf8",
    );
    assert.match(card, /t\("sparklineCount"/);
    assert.equal(/\bpts\b/.test(card), false);
  });
});
