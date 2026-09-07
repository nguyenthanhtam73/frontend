import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const src = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "progress-entry-card.tsx"),
  "utf8",
);

describe("ProgressEntryCard reanalyze CTA", () => {
  it("gates the CTA with canShowReanalyzeCta and keeps it while in-flight", () => {
    assert.match(src, /canShowReanalyzeCta\(entry\) \|\| inFlight/);
    assert.match(src, /data-testid="progress-reanalyze"/);
    assert.match(src, /t\("reanalyzeCta"\)/);
  });

  it("uses a full-width ≥44px tap target under the photo row (390px)", () => {
    assert.match(src, /min-h-11 w-full max-w-full/);
    assert.match(src, /border-t border-border\/60 px-3 pb-3 pt-2/);
    const thumbIdx = src.indexOf("size-20 shrink-0");
    const ctaIdx = src.indexOf('data-testid="progress-reanalyze"');
    assert.ok(thumbIdx > 0 && ctaIdx > thumbIdx);
  });

  it("disables and marks busy while POST+poll is in flight", () => {
    assert.match(src, /disabled=\{inFlight\}/);
    assert.match(src, /aria-busy=\{inFlight\}/);
    assert.match(src, /t\("reanalyzeBusy"\)/);
  });
});
