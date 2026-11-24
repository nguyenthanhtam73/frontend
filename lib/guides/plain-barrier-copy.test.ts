import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const ROOT = path.resolve(import.meta.dirname, "../..");

const FILES = [
  "lib/guides/articles/da-kho.ts",
  "lib/guides/articles/da-nhay-cam.ts",
  "lib/guides/articles/kich-ung-adapalene.ts",
];

describe("guide barrier wording", () => {
  it("says lớp ngoài da in the three Vietnamese guides", () => {
    const joined = FILES.map((rel) => fs.readFileSync(path.join(ROOT, rel), "utf8")).join("\n");
    const vi = [...joined.matchAll(/vi:\s*\{[\s\S]*?\n\s{6}en:/g)].map((m) => m[0]).join("\n");
    const source = vi || joined;
    assert.equal(source.includes("hàng rào"), false);
    assert.match(joined, /Thường là lớp ngoài da đang khô/);
    assert.match(joined, /làm lớp ngoài da dễ nứt hơn/);
    assert.match(joined, /Hay gặp khi lớp ngoài da yếu/);
    assert.match(joined, /chỉ là lớp ngoài da đang khô/);
    assert.match(joined, /Kích ứng lớp ngoài da/);
    assert.match(joined, /không làm lớp ngoài da khỏe hơn/);
    assert.match(joined, /vẫn cần lớp ngoài da/);
    assert.match(joined, /không đo ‘lớp ngoài da khỏe đến đâu’/);
    assert.match(joined, /để lớp ngoài da kêu/);
  });
});
