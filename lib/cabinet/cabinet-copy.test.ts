import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readLocale(locale: "vi" | "en") {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "messages", `${locale}.json`), "utf8")) as {
    metadata: { cabinet: { description: string } };
    cabinet: Record<string, unknown>;
  };
}

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (value && typeof value === "object") {
    for (const child of Object.values(value as Record<string, unknown>)) collectStrings(child, out);
  }
  return out;
}

describe("cabinet user-facing copy", () => {
  it("does not say affiliate or PAO on the shelf, in Vietnamese or English", () => {
    for (const locale of ["vi", "en"] as const) {
      const messages = readLocale(locale);
      const blobs = [
        ...collectStrings(messages.cabinet),
        messages.metadata.cabinet.description,
      ];
      for (const text of blobs) {
        assert.doesNotMatch(text, /affiliate/i, `${locale}: ${text}`);
        assert.doesNotMatch(text, /\bPAO\b/, `${locale}: ${text}`);
      }
    }
  });

  it("talks about finishing the product in everyday Vietnamese", () => {
    const { cabinet } = readLocale("vi");
    for (const key of [
      "paoHintFreshFixed",
      "paoHintFreshRange",
      "paoHintFixed",
      "paoHintRange",
      "paoAddOpenedCta",
    ]) {
      const text = cabinet[key];
      assert.equal(typeof text, "string");
      assert.match(text as string, /dùng hết trong khoảng/);
    }
    const insight = cabinet.insight as { keepUsing: string; pauseUsing: string };
    assert.equal(insight.keepUsing, "Nên dùng tiếp");
    assert.equal(insight.pauseUsing, "Chưa nên dùng tiếp");
    assert.doesNotMatch(insight.keepUsing, /mua/i);
    assert.doesNotMatch(insight.pauseUsing, /mua/i);
  });
});
