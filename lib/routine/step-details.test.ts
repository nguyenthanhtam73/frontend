import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  mapCabinetProducts,
  normalizeStepSkin,
  resolveStepCategory,
  seedStepDetails,
  skinTypeFromProfile,
} from "./step-details";

describe("seedStepDetails", () => {
  it("seeds Vietnamese cleanser how_to + dose by oily skin (AM)", () => {
    const out = seedStepDetails(
      { title: "Sữa rửa mặt gel dịu", category: "cleanser" },
      { period: "morning", skinType: "oily", locale: "vi" },
    );
    assert.equal(out.category, "cleanser");
    assert.match(out.how_to, /Nước ấm/);
    assert.match(out.how_to, /60/);
    assert.match(out.how_to, /xả mát/);
    assert.equal(out.dose, "1–2 pump");
    assert.doesNotMatch(out.how_to, /chữa|khỏi bệnh|chẩn đoán|cure|diagnos/i);
  });

  it("uses a gentler dry-skin cleanser seed and pea-size dose", () => {
    const out = seedStepDetails(
      { title: "Sữa rửa mặt dạng kem" },
      { period: "morning", skinType: "dry", locale: "vi" },
    );
    assert.equal(out.category, "cleanser");
    assert.match(out.how_to, /dạng kem|không nóng/);
    assert.equal(out.dose, "hạt đậu");
  });

  it("evening cleanser mentions removing sunscreen", () => {
    const out = seedStepDetails(
      { title: "Rửa mặt dịu" },
      { period: "evening", skinType: "combo", locale: "vi" },
    );
    assert.match(out.how_to, /kem chống nắng/);
  });

  it("seeds SPF dose as two finger-lengths (vi)", () => {
    const out = seedStepDetails(
      { title: "Kem chống nắng mỗi sáng", category: "spf" },
      { period: "morning", skinType: "sensitive", locale: "vi" },
    );
    assert.equal(out.dose, "2 ngón tay");
    assert.match(out.how_to, /sáng/);
  });

  it("prefers persisted how_to and dose over seeds", () => {
    const out = seedStepDetails(
      {
        title: "Cleanser",
        category: "cleanser",
        how_to: "Custom rinse.",
        dose: "½ pump",
      },
      { period: "morning", skinType: "oily", locale: "en" },
    );
    assert.equal(out.how_to, "Custom rinse.");
    assert.equal(out.dose, "½ pump");
  });

  it("infers toner / treatment from title when category is other", () => {
    assert.equal(resolveStepCategory({ title: "Toner/essence cấp ẩm", category: "other" }), "toner");
    assert.equal(
      resolveStepCategory({ title: "Tuỳ chọn: tối đa 1 BHA hoặc retinoid" }),
      "treatment",
    );
  });
});

describe("normalizeStepSkin / skinTypeFromProfile", () => {
  it("maps common aliases and falls back for prefer_not", () => {
    assert.equal(normalizeStepSkin("oily"), "oily");
    assert.equal(normalizeStepSkin("da khô"), "dry");
    assert.equal(normalizeStepSkin("prefer_not"), "default");
    assert.equal(normalizeStepSkin("combo"), "default");
  });

  it("reads skin_type from profile then onboarding photo analysis", () => {
    assert.equal(
      skinTypeFromProfile({
        id: "p",
        user_id: "u",
        skill_level: "beginner",
        version: 1,
        created_at: "",
        updated_at: "",
        skin_type: "sensitive",
      }),
      "sensitive",
    );
    assert.equal(
      skinTypeFromProfile({
        id: "p",
        user_id: "u",
        skill_level: "beginner",
        version: 1,
        created_at: "",
        updated_at: "",
        onboarding_snapshot: {
          skin_analysis: { overall_skin_type: "dry" },
        },
      }),
      "dry",
    );
  });
});

describe("mapCabinetProducts", () => {
  it("maps one cabinet product per matching category and allows AM/PM reuse", () => {
    const products = [
      { id: "c1", user_id: "u", name: "Foaming Cleanser", brand: "CeraVe", category: "cleanser", created_at: "", updated_at: "" },
      { id: "s1", user_id: "u", name: "UV Aqua", brand: "Skin Aqua", category: "spf", created_at: "", updated_at: "" },
    ];
    const morning = [
      { id: "m1", title: "Sữa rửa mặt dịu", category: "cleanser" },
      { id: "m2", title: "Kem chống nắng", category: "spf" },
    ];
    const evening = [{ id: "e1", title: "Rửa mặt", category: "cleanser" }];
    const map = mapCabinetProducts(morning, evening, products);
    assert.equal(map.m1, "CeraVe · Foaming Cleanser");
    assert.equal(map.m2, "Skin Aqua · UV Aqua");
    assert.equal(map.e1, "CeraVe · Foaming Cleanser");
  });

  it("does not assign the same product to two AM steps", () => {
    const products = [
      { id: "c1", user_id: "u", name: "Gel rửa mặt", category: "cleanser", created_at: "", updated_at: "" },
    ];
    const morning = [
      { id: "m1", title: "Sữa rửa mặt", category: "cleanser" },
      { id: "m2", title: "Tẩy trang", category: "cleanser" },
    ];
    const map = mapCabinetProducts(morning, [], products);
    assert.equal(map.m1, "Gel rửa mặt");
    assert.equal(map.m2, undefined);
  });
});
