import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { GAME_CLIPS, GAME_HAIRS, GAME_OUTFITS } from "@/lib/mascot/game/look";
import { SKIN_CONCERNS } from "@/lib/mascot/model";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCAN_DIRS = ["app", "components", "lib", "hooks"].map((dir) => path.join(ROOT, dir));
const CALL_RE = /\b(t|t[A-Z][A-Za-z0-9]*)\(\s*(["'`])([\s\S]*?)\2/g;

type Bag = Record<string, unknown>;

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx|ts)$/.test(entry.name) && !entry.name.endsWith(".test.ts") && !entry.name.endsWith(".test.tsx")) {
      out.push(full);
    }
  }
  return out;
}

function lookup(tree: Bag, key: string): { found: boolean; leaf: boolean } {
  let cursor: unknown = tree;
  for (const part of key.split(".")) {
    if (cursor == null || typeof cursor !== "object" || !(part in (cursor as Bag))) return { found: false, leaf: false };
    cursor = (cursor as Bag)[part];
  }
  return { found: true, leaf: typeof cursor === "string" };
}

function stringList(source: string, name: string): string[] {
  const match = source.match(new RegExp(`(?:const|let)\\s+${name}\\b[^=]*=\\s*\\[([\\s\\S]*?)\\]`));
  if (!match) return [];
  return [...match[1].matchAll(/["']([A-Za-z0-9_]+)["']/g)].map((item) => item[1] ?? "");
}

function mappedSuffixes(source: string, index: number, expr: string): string[] {
  const before = source.slice(Math.max(0, index - 700), index);
  const inline = [...before.matchAll(/\[((?:"[^"]+"|'[^']+')(?:\s*,\s*(?:"[^"]+"|'[^']+'))*)\]\s*(?:as\s+const\s*)?\.map\(\s*\(?\s*(\w+)/g)];
  for (const item of inline) {
    if (item[2] !== expr) continue;
    return [...(item[1] ?? "").matchAll(/["']([A-Za-z0-9_]+)["']/g)].map((bit) => bit[1] ?? "");
  }
  const named = [...before.matchAll(/(\w+)\s*(?:as\s+const\s*)?\.map\(\s*\(?\s*(\w+)/g)];
  for (const item of named) {
    if (item[2] !== expr) continue;
    const values = stringList(source, item[1] ?? "");
    if (values.length > 0) return values;
  }
  return [];
}

function lineKeys(): string[] {
  const source = fs.readFileSync(path.join(ROOT, "lib/mascot/model.ts"), "utf8");
  const block = source.match(/const LINE_KEYS = new Set<string>\(\[([\s\S]*?)\]\)/);
  return [...(block?.[1] ?? "").matchAll(/["']([A-Za-z0-9_]+)["']/g)].map((item) => item[1] ?? "");
}

function toastKinds(source: string): string[] {
  const block = source.match(/kind:\s*"([A-Za-z0-9_]+)"(?:\s*\|\s*"([A-Za-z0-9_]+)")+/);
  if (!block) return [];
  return [...block[0].matchAll(/"([A-Za-z0-9_]+)"/g)].map((item) => item[1] ?? "").filter((kind) => kind !== "worn" && kind !== "wear-failed" && kind !== "nudge");
}

describe("mascot message keys", () => {
  it("has a string in vi and en for every mascot key the code asks for", () => {
    const vi = JSON.parse(fs.readFileSync(path.join(ROOT, "messages/vi.json"), "utf8")).mascot as Bag;
    const en = JSON.parse(fs.readFileSync(path.join(ROOT, "messages/en.json"), "utf8")).mascot as Bag;
    const missing: string[] = [];

    function need(key: string, where: string) {
      const left = lookup(vi, key);
      const right = lookup(en, key);
      if (left.leaf && right.leaf) return;
      const viState = left.leaf ? "string" : left.found ? "not a string" : "missing";
      const enState = right.leaf ? "string" : right.found ? "not a string" : "missing";
      missing.push(`${key} (${where}) vi=${viState} en=${enState}`);
    }

    for (const dir of SCAN_DIRS) {
      for (const file of walk(dir)) {
        const source = fs.readFileSync(file, "utf8");
        if (!/useTranslations\(\s*["']mascot["']\)|getTranslations\(\s*["']mascot["']\)/.test(source)) continue;
        const rel = path.relative(ROOT, file).replace(/\\/g, "/");
        CALL_RE.lastIndex = 0;
        let match: RegExpExecArray | null;
        while ((match = CALL_RE.exec(source))) {
          const raw = match[3] ?? "";
          if (!raw.includes("${")) {
            if (raw.includes("\n") || raw.includes("{")) continue;
            need(raw, rel);
            continue;
          }
          const hole = raw.match(/^([A-Za-z0-9_.]+)\.\$\{([^}]+)\}$/);
          if (!hole) continue;
          const prefix = hole[1] ?? "";
          const expr = (hole[2] ?? "").trim();
          let suffixes = mappedSuffixes(source, match.index, expr.split(".").pop() ?? expr);
          if (prefix === "lines") suffixes = lineKeys();
          if (prefix === "concerns") suffixes = [...SKIN_CONCERNS];
          if (prefix === "game.look") suffixes = [...GAME_OUTFITS, ...GAME_HAIRS, ...GAME_CLIPS, "clip_none", ...stringList(source, "WORN_EXTRAS")];
          if (prefix === "game.toast") suffixes = toastKinds(source);
          if (prefix === "game" && expr.includes("label")) suffixes = stringList(source, "NAV").length ? stringList(source, "NAV") : ["care", "wardrobe", "quests", "lobby"];
          if (prefix === "game" && expr.includes("STATE_KEY")) {
            suffixes = [...source.matchAll(/STATE_KEY[^=]*=\s*\{([\s\S]*?)\}/g)].flatMap((block) =>
              [...(block[1] ?? "").matchAll(/:\s*"([A-Za-z0-9_]+)"/g)].map((item) => item[1] ?? ""),
            );
          }
          for (const suffix of suffixes) need(`${prefix}.${suffix}`, rel);
        }
      }
    }

    assert.deepEqual(missing, []);
  });
});
