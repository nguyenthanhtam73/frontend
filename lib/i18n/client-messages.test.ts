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

  it("does not leave an English pts unit on the Vietnamese progress trend", () => {
    const messages = JSON.parse(fs.readFileSync(path.join(ROOT, "messages/vi.json"), "utf8")) as {
      progress: { summary: { sparklineCount: string } };
    };
    const enMessages = JSON.parse(fs.readFileSync(path.join(ROOT, "messages/en.json"), "utf8")) as {
      progress: { summary: { sparklineCount: string } };
    };
    assert.equal(messages.progress.summary.sparklineCount, "{n} điểm");
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
