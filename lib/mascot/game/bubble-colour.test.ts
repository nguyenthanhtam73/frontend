import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BUBBLE_COLOURS, bubbleColour, bubbleFrameStyle } from "@/lib/mascot/game/bubble-colour";

function channel(hex: string, shift: number): number {
  const value = parseInt(hex.slice(1), 16);
  const raw = ((value >> shift) & 255) / 255;
  return raw <= 0.03928 ? raw / 12.92 : ((raw + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  return 0.2126 * channel(hex, 16) + 0.7152 * channel(hex, 8) + 0.0722 * channel(hex, 0);
}

function contrast(ink: string, paper: string): number {
  const a = luminance(ink);
  const b = luminance(paper);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

describe("bubble colours", () => {
  it("keeps the four handoff colours and ignores the leaf placeholder", () => {
    assert.deepEqual(BUBBLE_COLOURS.map((colour) => colour.id), ["kem_hong", "mint_mat", "vang_mat", "dao_cam"]);
    assert.equal(bubbleColour("shop_bubble_la"), null);
    assert.equal(bubbleColour("kem_ngot"), null);
    assert.equal(bubbleFrameStyle("mint_mat")?.background, "#E7F7F2");
    assert.equal(bubbleFrameStyle("shop_bubble_la"), undefined);
  });

  it("keeps text readable on every fill", () => {
    for (const colour of BUBBLE_COLOURS) {
      assert.ok(contrast(colour.color, colour.background) >= 4.5, colour.id);
    }
  });
});
