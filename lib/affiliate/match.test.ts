import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isDiscounted, matchAffiliateSuggestions } from "./match";
import type { AffiliateCatalog, AffiliateMatchInput, AffiliateProduct } from "./types";
import { allWhySentences } from "./why-copy";

const DAY = "2026-11-24";

function input(partial: Partial<AffiliateMatchInput>): AffiliateMatchInput {
  return {
    userId: "user-1",
    dayKey: DAY,
    skinTypes: [],
    concerns: [],
    ownedSteps: [],
    severe: false,
    avoidAcid: false,
    cabinetKnown: true,
    ...partial,
  };
}

function names(partial: Partial<AffiliateMatchInput>) {
  return matchAffiliateSuggestions(input(partial)).map((item) => item.name);
}

describe("affiliate matching", () => {
  it("picks sunscreen, an oily cleanser, and an acne serum for an oily acne user", () => {
    const picks = matchAffiliateSuggestions(
      input({
        userId: "oily-acne",
        skinTypes: ["oily"],
        concerns: ["acne", "oil"],
      }),
    );
    assert.ok(picks.length >= 1 && picks.length <= 3);
    assert.deepEqual(
      picks.map((item) => item.step),
      ["sunscreen", "cleanser", "serum"],
    );
    assert.match(picks[0]!.name, /Anthelios XL/);
    assert.equal(picks[1]!.name, "CeraVe Foaming Cleanser 236ml");
    assert.equal(picks[2]!.name, "Paula's Choice 2% BHA Liquid Exfoliant 30ml");
    assert.equal(
      picks[1]!.why,
      "Da bạn hay đổ dầu, sữa rửa mặt tạo bọt là kiểu hay dùng cho da dầu.",
    );
    assert.match(picks[0]!.why, /giúp bảo vệ da khỏi nắng mỗi ngày/);
    assert.match(picks[0]!.affLink, /^https:\/\/s\.shopee\.vn\/[A-Za-z0-9]+$/);
    const again = names({ userId: "oily-acne", skinTypes: ["oily"], concerns: ["acne", "oil"] });
    assert.deepEqual(again, picks.map((item) => item.name));
    assert.equal(again.some((name) => /Hydrating|Mela B3|Centella|AHA-BHA-PHA/.test(name)), false);
  });

  it("picks a hydrating cleanser and a moisture serum for a dry user", () => {
    const picks = matchAffiliateSuggestions(
      input({
        userId: "dry-user",
        skinTypes: ["dry"],
        concerns: ["dryness"],
      }),
    );
    assert.equal(picks.length, 3);
    assert.match(picks[0]!.name, /Anthelios/);
    assert.equal(picks[1]!.name, "CeraVe Hydrating Cleanser 473ml");
    assert.equal(picks[2]!.name, "Skin1004 Centella Hyalu-Cica Serum 50ml");
    assert.equal(picks[0]!.step, "sunscreen");
    assert.equal(picks[1]!.why, "Da bạn thiên khô, sữa rửa mặt dịu là kiểu hay dùng cho da khô.");
    assert.match(picks[2]!.why, /thiếu ẩm/);
    assert.equal(
      picks.some((item) => /Foaming|Blemish|AHA-BHA-PHA|Paula/.test(item.name)),
      false,
    );
  });

  it("skips sunscreen when the cabinet already has it", () => {
    const picks = matchAffiliateSuggestions(
      input({
        userId: "has-spf",
        skinTypes: ["oily"],
        concerns: ["acne", "oil"],
        ownedSteps: ["sunscreen"],
      }),
    );
    assert.equal(picks.some((item) => item.step === "sunscreen"), false);
    assert.ok(picks.length >= 1 && picks.length <= 3);
    assert.deepEqual(
      picks.map((item) => item.step),
      ["cleanser", "serum", "moisturizer"],
    );
    assert.equal(picks[0]!.name, "CeraVe Foaming Cleanser 236ml");
    assert.equal(picks[2]!.name, "CeraVe Moisturising Cream 50ml");
  });

  it("skips acid products when the routine is calm-first or the skin is reactive", () => {
    const calm = matchAffiliateSuggestions(
      input({
        userId: "calm",
        skinTypes: ["oily"],
        concerns: ["acne", "oil"],
        avoidAcid: true,
      }),
    );
    assert.equal(calm.some((item) => /AHA|BHA|Mela B3|Peeling/.test(item.name)), false);
    assert.deepEqual(
      calm.map((item) => item.step),
      ["sunscreen", "cleanser", "moisturizer"],
    );

    const reactive = matchAffiliateSuggestions(
      input({
        userId: "red",
        skinTypes: ["oily"],
        concerns: ["acne", "oil", "redness"],
        avoidAcid: true,
      }),
    );
    assert.equal(reactive.some((item) => item.name.includes("Paula")), false);
  });

  it("shows nothing for a step the batch does not stock", () => {
    const picks = matchAffiliateSuggestions(input({ userId: "any", skinTypes: ["oily"], concerns: ["acne"] }));
    assert.equal(picks.some((item) => item.step === "makeup_remover"), false);
    assert.equal(picks.some((item) => item.name.includes("Bioderma")), false);
    assert.equal(picks.some((item) => item.name.includes("AHA-BHA-PHA")), false);
  });

  it("returns nothing for a severe case", () => {
    const picks = matchAffiliateSuggestions(
      input({
        userId: "severe",
        skinTypes: ["oily"],
        concerns: ["acne", "oil"],
        severe: true,
      }),
    );
    assert.deepEqual(picks, []);
  });

  it("breaks a fit tie toward the discounted price", () => {
    const base: Omit<AffiliateProduct, "name" | "originalPriceVnd" | "affLink"> = {
      step: "serum",
      fit: ["acne"],
      priceVnd: 100000,
      rating: 4.9,
      sold: "1k+",
      shop: "Shop",
      acid: false,
      popularity: 50,
    };
    const catalog: AffiliateCatalog = {
      batch: "w20261124",
      items: [
        { ...base, name: "Full price", originalPriceVnd: null, affLink: "https://s.shopee.vn/full" },
        { ...base, name: "On sale", originalPriceVnd: 120000, affLink: "https://s.shopee.vn/sale" },
      ],
    };
    const [only] = matchAffiliateSuggestions(input({ concerns: ["acne"] }), catalog);
    assert.equal(only!.name, "On sale");
    assert.equal(isDiscounted(catalog.items[0]!), false);
    assert.equal(isDiscounted(catalog.items[1]!), true);
  });

  it("prefers more reviews and sold before a discount", () => {
    const base: Omit<AffiliateProduct, "name" | "popularity" | "originalPriceVnd" | "affLink"> = {
      step: "serum",
      fit: ["acne"],
      priceVnd: 100000,
      rating: 4.9,
      sold: "1k+",
      shop: "Shop",
      acid: false,
    };
    const catalog: AffiliateCatalog = {
      batch: "w20261124",
      items: [
        {
          ...base,
          name: "Quiet sale",
          popularity: 10,
          originalPriceVnd: 200000,
          affLink: "https://s.shopee.vn/quiet",
        },
        {
          ...base,
          name: "Popular full",
          popularity: 90,
          originalPriceVnd: null,
          affLink: "https://s.shopee.vn/popular",
        },
      ],
    };
    const [only] = matchAffiliateSuggestions(input({ concerns: ["acne"] }), catalog);
    assert.equal(only!.name, "Popular full");
  });

  it("does not promise a cure in any why-line", () => {
    for (const line of allWhySentences()) {
      assert.doesNotMatch(
        line,
        /trị khỏi|hết mụn|trắng da|hết thâm|không thâm thêm|đều màu hơn|thông thoáng hơn|cures|whitening|getting darker|more even|feel clearer/i,
      );
    }
  });
});
