import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const src = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "save-bar.tsx"),
  "utf8",
);

function quotaParagraph(): string {
  const match = src.match(
    /data-testid="routine-save-quota"[\s\S]*?<\/p>/,
  );
  assert.ok(match, "expected routine-save-quota paragraph");
  return match[0];
}

describe("SaveBar quota hint layout", () => {
  it("keeps quota under the status hint instead of a flex-1 CTA sibling", () => {
    assert.match(src, /min-w-0 flex-1 space-y-0\.5/);
    assert.match(src, /data-testid="routine-save-hint"/);
    assert.match(src, /data-testid="routine-save-quota"/);

    const hintIdx = src.indexOf('data-testid="routine-save-hint"');
    const quotaIdx = src.indexOf('data-testid="routine-save-quota"');
    const ctaIdx = src.indexOf('data-testid="routine-save"');
    assert.ok(hintIdx > 0 && quotaIdx > hintIdx && ctaIdx > quotaIdx);

    const quota = quotaParagraph();
    assert.doesNotMatch(quota, /\bflex-1\b/);
    assert.doesNotMatch(quota, /order-first/);
    assert.match(quota, /\btruncate\b/);
  });

  it("keeps the CTA group shrink-0 with ≥44px tap targets", () => {
    assert.match(src, /grid shrink-0 grid-cols-2/);
    assert.match(src, /min-h-11/);
    assert.doesNotMatch(src, /sm:min-h-9/);
  });
});
