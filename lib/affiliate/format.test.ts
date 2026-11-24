import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatSoldCount } from "./format";

describe("formatSoldCount", () => {
  it("spells thousands and millions in Vietnamese and keeps English compact", () => {
    assert.equal(formatSoldCount("500k+", "vi"), "500 nghìn+");
    assert.equal(formatSoldCount("2tr+", "vi"), "2 triệu+");
    assert.equal(formatSoldCount("2m+", "vi"), "2 triệu+");
    assert.equal(formatSoldCount("1,2tr+", "vi"), "1,2 triệu+");
    assert.equal(formatSoldCount("1.2m+", "vi"), "1,2 triệu+");
    assert.equal(formatSoldCount("6k+", "vi"), "6 nghìn+");
    assert.equal(formatSoldCount("929", "vi"), "929");

    assert.equal(formatSoldCount("500k+", "en"), "500K+");
    assert.equal(formatSoldCount("2tr+", "en"), "2M+");
    assert.equal(formatSoldCount("2m+", "en"), "2M+");
    assert.equal(formatSoldCount("1.2tr+", "en"), "1.2M+");
  });
});
