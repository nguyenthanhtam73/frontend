import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isInsightCurrent,
  normalizeProductInsight,
  PRODUCT_INSIGHT_VERSION,
} from "./product-insight";

const sample = {
  what_it_does: "Kem chống nắng che da khỏi nắng.",
  fit_for_you: { verdict: "yes", reason: "Hợp với da khô." },
  buy_advice: { verdict: "buy", reason: "Nên có kem chống nắng mỗi sáng." },
  actives: [
    { label: "BHA", plain: "BHA chui vào lỗ chân lông để gỡ dầu." },
    { label: " ", plain: "bỏ" },
    { label: "Niacinamide", plain: "Niacinamide là vitamin B3." },
    { label: "Ceramide", plain: "Giúp da đỡ khô." },
    { label: "Kẽm", plain: "Giúp da dầu đỡ bóng." },
  ],
  disclaimer: "Gợi ý này chỉ để tham khảo, không thay bác sĩ da liễu.",
  locale: "vi-VN",
  version: PRODUCT_INSIGHT_VERSION,
};

describe("normalizeProductInsight", () => {
  it("maps the backend card and caps actives at 3", () => {
    const card = normalizeProductInsight(sample);
    assert.ok(card);
    assert.equal(card.whatItDoes, sample.what_it_does);
    assert.equal(card.fit.verdict, "yes");
    assert.equal(card.buy.verdict, "buy");
    assert.equal(card.locale, "vi");
    assert.deepEqual(
      card.actives.map((item) => item.label),
      ["BHA", "Niacinamide", "Ceramide"],
    );
    assert.equal(card.disclaimer, sample.disclaimer);
  });

  it("coerces unknown verdicts instead of dropping the card", () => {
    const card = normalizeProductInsight({
      ...sample,
      fit_for_you: { verdict: "great", reason: "Có thể hợp." },
      buy_advice: { verdict: "later", reason: "Chưa nên." },
    });
    assert.equal(card?.fit.verdict, "maybe");
    assert.equal(card?.buy.verdict, "wait");
  });

  it("returns null when the card is incomplete", () => {
    assert.equal(normalizeProductInsight(null), null);
    assert.equal(normalizeProductInsight([]), null);
    assert.equal(normalizeProductInsight({ what_it_does: "Chỉ có câu này" }), null);
    assert.equal(
      normalizeProductInsight({ ...sample, disclaimer: "  " }),
      null,
    );
  });

  it("treats a missing version as stale", () => {
    const card = normalizeProductInsight({ ...sample, version: undefined, locale: "en" });
    assert.equal(card?.version, 0);
    assert.equal(card?.locale, "en");
    assert.equal(isInsightCurrent(card, "en"), false);
    assert.equal(isInsightCurrent(normalizeProductInsight(sample), "vi"), true);
    assert.equal(isInsightCurrent(normalizeProductInsight(sample), "en"), false);
  });
});
