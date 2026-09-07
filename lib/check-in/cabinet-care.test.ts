import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  careRoleFromText,
  cabinetCoveredRoles,
  isAffiliateRoleCovered,
  matchCabinetToCare,
} from "./cabinet-care";
import type { WardrobeProductDTO } from "@/lib/types/wardrobe";

function product(partial: Partial<WardrobeProductDTO> & { id: string; name: string }): WardrobeProductDTO {
  return {
    user_id: "u1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...partial,
  };
}

describe("careRoleFromText", () => {
  it("maps everyday care steps to cabinet categories", () => {
    assert.equal(careRoleFromText("Rửa mặt dịu"), "cleanser");
    assert.equal(careRoleFromText("Dưỡng ẩm"), "moisturizer");
    assert.equal(careRoleFromText("Chống nắng"), "spf");
    assert.equal(careRoleFromText("cleanse"), "cleanser");
    assert.equal(careRoleFromText("spf"), "spf");
    assert.equal(careRoleFromText("không liên quan"), null);
  });
});

describe("matchCabinetToCare", () => {
  const shelf = [
    product({ id: "p1", name: "CeraVe Foaming", category: "cleanser" }),
    product({ id: "p2", name: "Illiyoon Cream", brand: "Illiyoon", category: "moisturizer" }),
    product({ id: "p3", name: "Skin Aqua", category: "spf" }),
  ];

  it("prefers owned products for matching care steps", () => {
    const hits = matchCabinetToCare({
      products: shelf,
      careSteps: [
        { step: "Rửa mặt dịu" },
        { step: "Dưỡng ẩm" },
        { step: "Chống nắng" },
      ],
    });
    assert.equal(hits.length, 3);
    assert.equal(hits[0]?.name, "CeraVe Foaming");
    assert.equal(hits[1]?.name, "Illiyoon Cream");
    assert.equal(hits[2]?.name, "Skin Aqua");
  });

  it("does not invent matches when the shelf lacks that role", () => {
    const hits = matchCabinetToCare({
      products: [shelf[0]!],
      careSteps: [{ step: "Chống nắng" }],
    });
    assert.deepEqual(hits, []);
  });
});

describe("affiliate role covered", () => {
  it("flags buy cards whose role is already on the shelf", () => {
    const covered = cabinetCoveredRoles([
      product({ id: "p1", name: "CeraVe", category: "moisturizer" }),
    ]);
    assert.equal(isAffiliateRoleCovered({ step: "moisturize", category: "moisturizer" }, covered), true);
    assert.equal(isAffiliateRoleCovered({ step: "spf" }, covered), false);
  });
});
