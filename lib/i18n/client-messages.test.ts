import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { ALL_CLIENT_MESSAGE_NAMESPACES } from "./client-messages";

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
