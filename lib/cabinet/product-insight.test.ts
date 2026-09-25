import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ownedInsightUse,
  parseWardrobeProductInsight,
  WARDROBE_INSIGHT_DISCLAIMER,
} from "./product-insight";

const sample = {
  what_it_does: "  Sữa rửa mặt dịu, lấy dầu thừa mà không kéo căng.  ",
  fit: { verdict: "yes", reason: "  Da dầu, check-in gần đây còn bóng vùng chữ T.  " },
  buy: { advice: "nên mua", why: "Tủ chưa có sữa rửa mặt." },
  actives: [
    { name: "Ceramide", gloss: "giữ lớp bảo vệ da khỏi khô rát" },
    { name: " ", gloss: "bỏ" },
    { gloss: "thiếu tên" },
    { name: "Ceramide", gloss: "trùng tên" },
    { name: "BHA", gloss: "làm thông lỗ chân lông" },
    { name: "Niacinamide", gloss: "làm dịu vùng đỏ" },
    { name: "Kẽm", gloss: "giảm bóng dầu" },
    { name: "Panthenol", gloss: "làm dịu da" },
    { name: "HA", gloss: "giữ nước" },
  ],
  disclaimer: "không thay bác sĩ da liễu",
};

describe("ownedInsightUse", () => {
  it("does not tell the owner to buy a product already in the cabinet", () => {
    assert.equal(ownedInsightUse("nên mua"), "keep");
    assert.equal(ownedInsightUse("chưa nên"), "pause");
  });
});

describe("parseWardrobeProductInsight", () => {
  it("maps the locked wardrobe insight and caps actives at 5", () => {
    const card = parseWardrobeProductInsight(sample);
    assert.ok(card);
    assert.equal(card.what_it_does, "Sữa rửa mặt dịu, lấy dầu thừa mà không kéo căng.");
    assert.equal(card.fit.verdict, "yes");
    assert.equal(card.fit.reason, "Da dầu, check-in gần đây còn bóng vùng chữ T.");
    assert.equal(card.buy.advice, "nên mua");
    assert.equal(card.buy.why, "Tủ chưa có sữa rửa mặt.");
    assert.equal(card.disclaimer, WARDROBE_INSIGHT_DISCLAIMER);
    assert.deepEqual(
      card.actives?.map((item) => item.name),
      ["Ceramide", "BHA", "Niacinamide", "Kẽm", "Panthenol"],
    );
    assert.equal(card.actives?.[0]?.gloss, "giữ lớp bảo vệ da khỏi khô rát");
  });

  it("omits actives when none are usable and fills an empty disclaimer", () => {
    const card = parseWardrobeProductInsight({
      what_it_does: "Kem dưỡng nhẹ.",
      fit: { verdict: "maybe", reason: "Chưa đủ check-in để chắc." },
      buy: { advice: "chưa nên", why: "Chưa rõ da mình." },
      actives: [{ label: "BHA", plain: "câu cũ" }],
      disclaimer: "  ",
    });
    assert.ok(card);
    assert.equal(card.actives, undefined);
    assert.equal(card.disclaimer, WARDROBE_INSIGHT_DISCLAIMER);
    assert.equal(card.buy.advice, "chưa nên");
  });

  it("rejects the retired client shape instead of coercing it", () => {
    assert.equal(
      parseWardrobeProductInsight({
        what_it_does: "Kem chống nắng che da khỏi nắng.",
        fit_for_you: { verdict: "yes", reason: "Hợp với da khô." },
        buy_advice: { verdict: "buy", reason: "Nên có kem chống nắng mỗi sáng." },
        actives: [{ label: "BHA", plain: "BHA chui vào lỗ chân lông." }],
        disclaimer: "Gợi ý này chỉ để tham khảo, không thay bác sĩ da liễu.",
        locale: "vi",
        version: 1,
      }),
      null,
    );
    assert.equal(
      parseWardrobeProductInsight({
        what_it_does: "Kem dưỡng.",
        fit: { verdict: "great", reason: "Có vẻ ổn." },
        buy: { advice: "buy", why: "Nên mua." },
      }),
      null,
    );
    assert.equal(
      parseWardrobeProductInsight({
        what_it_does: "Kem dưỡng.",
        fit: { verdict: "yes", reason: "Hợp." },
        buy: { verdict: "wait", why: "Chưa nên." },
      }),
      null,
    );
  });

  it("returns null when the card is incomplete", () => {
    assert.equal(parseWardrobeProductInsight(null), null);
    assert.equal(parseWardrobeProductInsight([]), null);
    assert.equal(parseWardrobeProductInsight({ what_it_does: "Chỉ có câu này" }), null);
    assert.equal(
      parseWardrobeProductInsight({
        what_it_does: "Kem dưỡng.",
        fit: { verdict: "no", reason: "   " },
        buy: { advice: "chưa nên", why: "Da đang rát." },
      }),
      null,
    );
  });
});
