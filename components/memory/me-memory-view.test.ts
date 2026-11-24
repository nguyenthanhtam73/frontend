import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { memoryPromptChipVisible } from "./me-memory-view.tsx";

describe("memory prompt version chip", () => {
  it("stays hidden unless the viewer is an admin and a version exists", () => {
    assert.equal(memoryPromptChipVisible(false, 36), false);
    assert.equal(memoryPromptChipVisible(true, 0), false);
    assert.equal(memoryPromptChipVisible(true, 36), true);
  });
});
