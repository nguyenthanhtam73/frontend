import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { affiliateCatalog } from "./catalog";
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
    assert.equal(picks[1]!.name, "CeraVe Foaming Cleanser 236ml");
    assert.equal(picks[2]!.name, "Some By Mi AHA-BHA-PHA 30 Days Serum 50ml");
    assert.equal(
      picks[1]!.why,
      "Da bạn hay đổ dầu, sữa rửa mặt tạo bọt giúp sạch dầu mà không khô căng.",
    );
    assert.match(picks[0]!.why, /Tủ đồ của bạn chưa có kem chống nắng/);
    assert.equal(picks[0]!.affLink.startsWith("https://s.shopee.vn/"), true);
    for (const pick of picks) {
      const source = affiliateCatalog.items.find((item) => item.affLink === pick.affLink)!;
      assert.notEqual(pick.affLink, source.url);
    }
    const again = names({ userId: "oily-acne", skinTypes: ["oily"], concerns: ["acne", "oil"] });
    assert.deepEqual(again, picks.map((item) => item.name));
    assert.equal(again.some((name) => /Hydrating|Mela B3|Centella|Paula/.test(name)), false);
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
    assert.equal(picks[1]!.why, "Da bạn thiên khô, sữa rửa mặt dịu giúp sạch mà không kéo căng.");
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
      commission: "8%",
      rating: 4.9,
      reviewCount: "10",
      sold: "1k+",
      shop: "Shop",
      url: "https://shopee.vn/product/1/2",
      subId1: "dadiary",
      subId2: "t",
    };
    const catalog: AffiliateCatalog = {
      batch: "t",
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

  it("does not promise a cure in any why-line", () => {
    for (const line of allWhySentences()) {
      assert.doesNotMatch(line, /trị khỏi|hết mụn|trắng da|hết thâm|cures|whitening/i);
    }
  });
});
