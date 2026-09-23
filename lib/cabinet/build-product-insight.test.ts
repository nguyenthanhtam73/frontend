import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildCabinetProductInsight, cabinetProductKey } from "./build-product-insight";

const BANNED = ["barrier", "retinoid", "exfoliant", "comedogenic", "humectant", "occlusive", "antioxidant"];

function blob(card: ReturnType<typeof buildCabinetProductInsight>): string {
  return [
    card.whatItDoes,
    card.fit.reason,
    card.buy.reason,
    card.disclaimer,
    ...card.actives.flatMap((item) => [item.label, item.plain]),
  ].join("\n");
}

describe("buildCabinetProductInsight", () => {
  it("pauses BHA when a recent check-in says skin is stinging", () => {
    const card = buildCabinetProductInsight({
      name: "Paula's Choice BHA",
      category: "serum",
      skinType: "oily",
      recentTags: ["stinging", "redness"],
      locale: "vi",
    });
    assert.equal(card.fit.verdict, "no");
    assert.equal(card.buy.verdict, "wait");
    assert.match(card.fit.reason, /check-in/);
    assert.match(card.actives[0]?.plain ?? "", /lỗ chân lông/);
    assert.equal(card.disclaimer, "Gợi ý này chỉ để tham khảo, không thay bác sĩ da liễu.");
  });

  it("says sunscreen is worth buying for dry skin", () => {
    const card = buildCabinetProductInsight({
      name: "Anessa",
      category: "spf",
      skinType: "dry",
      locale: "vi",
    });
    assert.equal(card.fit.verdict, "yes");
    assert.equal(card.buy.verdict, "buy");
    assert.match(card.whatItDoes, /Kem chống nắng/);
    assert.match(card.fit.reason, /da khô/);
  });

  it("treats niacinamide as a fit for oily skin", () => {
    const card = buildCabinetProductInsight({
      name: "The Ordinary Niacinamide 10%",
      category: "serum",
      skinType: "oily",
      locale: "vi",
    });
    assert.equal(card.fit.verdict, "yes");
    assert.equal(card.buy.verdict, "buy");
    assert.match(card.actives[0]?.plain ?? "", /vitamin B3/);
  });

  it("treats toner as optional", () => {
    const card = buildCabinetProductInsight({
      name: "Nước hoa hồng",
      category: "toner",
      skinType: "normal",
      locale: "vi",
    });
    assert.equal(card.fit.verdict, "maybe");
    assert.equal(card.buy.verdict, "wait");
  });

  it("guesses sunscreen from the product name", () => {
    const card = buildCabinetProductInsight({
      name: "Kem chống nắng SPF50",
      locale: "vi",
    });
    assert.match(card.whatItDoes, /Kem chống nắng/);
    assert.equal(card.buy.verdict, "buy");
  });

  it("waits on retinol for sensitive skin", () => {
    const card = buildCabinetProductInsight({
      name: "Retinol 0.2",
      category: "treatment",
      skinType: "sensitive",
      locale: "en",
    });
    assert.equal(card.fit.verdict, "no");
    assert.equal(card.buy.verdict, "wait");
    assert.equal(card.locale, "en");
    assert.match(card.disclaimer, /dermatologist/);
  });

  it("keeps the product key stable when only skin type changes", () => {
    const base = { name: "Cleanser", brand: "CeraVe", category: "cleanser", locale: "vi" };
    const oily = buildCabinetProductInsight({ ...base, skinType: "oily" });
    const dry = buildCabinetProductInsight({ ...base, skinType: "dry" });
    assert.equal(cabinetProductKey(base), cabinetProductKey(base));
    assert.equal(oily.whatItDoes, dry.whatItDoes);
    assert.notEqual(oily.fit.reason, dry.fit.reason);
    assert.notEqual(cabinetProductKey(base), cabinetProductKey({ ...base, name: "Other cleanser" }));
  });

  it("keeps Vietnamese copy free of unexplained jargon", () => {
    const names = ["Kem dưỡng", "BHA serum", "Retinol 0.5", "Niacinamide 10%", "SPF50", "Centella cream", "Tretinoin"];
    const skins = ["", "oily", "dry", "sensitive", "combo", "normal"];
    const recents = [[], ["stinging"], ["new_breakouts"], ["dry"]];
    const categories = ["", "cleanser", "toner", "serum", "moisturizer", "spf", "treatment", "mask", "other"];
    for (const name of names) {
      for (const skinType of skins) {
        for (const recentTags of recents) {
          for (const category of categories) {
            const card = buildCabinetProductInsight({ name, category, skinType, recentTags, locale: "vi" });
            const text = blob(card).toLowerCase();
            for (const word of BANNED) {
              assert.equal(text.includes(word), false, `${word} in ${text}`);
            }
            if (blob(card).includes("BHA")) {
              assert.match(blob(card), /lỗ chân lông/);
            }
            assert.ok(["yes", "maybe", "no"].includes(card.fit.verdict));
            assert.ok(["buy", "wait"].includes(card.buy.verdict));
            assert.ok(card.whatItDoes.trim());
            assert.ok(card.disclaimer.trim());
          }
        }
      }
    }
  });
});
