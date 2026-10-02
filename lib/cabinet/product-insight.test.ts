import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  formatActiveLine,
  LEGACY_UNKNOWN_BUY_WHY,
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

describe("formatActiveLine", () => {
  const coconutGloss = "dưỡng ẩm, nhưng khá đặc nên có thể bít lỗ chân lông trên da mặt";

  it("joins the ingredient and gloss with a colon in Vietnamese and English", () => {
    assert.equal(formatActiveLine("Dầu dừa", coconutGloss), `Dầu dừa: ${coconutGloss}`);
    assert.equal(
      formatActiveLine("Niacinamide", "làm dịu vùng đỏ"),
      "Niacinamide: làm dịu vùng đỏ",
    );
    assert.equal(
      formatActiveLine("Coconut oil", "moisturizes, but it is quite thick and may clog pores"),
      "Coconut oil: moisturizes, but it is quite thick and may clog pores",
    );
    assert.equal(formatActiveLine("  BHA  ", "  làm thông lỗ chân lông  "), "BHA: làm thông lỗ chân lông");
  });

  it("does not add a second mark when the name already ends with punctuation", () => {
    assert.equal(formatActiveLine("Dầu dừa.", coconutGloss), `Dầu dừa. ${coconutGloss}`);
    assert.equal(formatActiveLine("Dầu dừa:", coconutGloss), `Dầu dừa: ${coconutGloss}`);
    assert.equal(formatActiveLine("BHA!", "làm thông lỗ chân lông"), "BHA! làm thông lỗ chân lông");
    assert.equal(formatActiveLine("Zinc?", "reduces shine"), "Zinc? reduces shine");
    assert.equal(formatActiveLine("Panthenol…", "soothes"), "Panthenol… soothes");
  });
});

describe("ownedInsightUse", () => {
  it("does not tell the owner to buy a product already in the cabinet", () => {
    assert.equal(ownedInsightUse("nên mua"), "keep");
    assert.equal(ownedInsightUse("chưa nên"), "pause");
    assert.equal(ownedInsightUse("chưa nên", "Da đang rát, tạm dừng đã."), "pause");
    assert.equal(ownedInsightUse("nên mua", LEGACY_UNKNOWN_BUY_WHY), "keep");
  });

  it("treats an explicit unknown token and the legacy not-enough-info card as unknown", () => {
    assert.equal(ownedInsightUse("chưa biết", "bất kỳ câu nào"), "unknown");
    assert.equal(ownedInsightUse(" chưa biết "), "unknown");
    assert.equal(ownedInsightUse("chưa nên", LEGACY_UNKNOWN_BUY_WHY), "unknown");
    assert.equal(ownedInsightUse("chưa nên", `  ${LEGACY_UNKNOWN_BUY_WHY}  `), "unknown");
  });

  it("does not throw on an unrecognized advice token", () => {
    assert.equal(ownedInsightUse("wat"), "unknown");
    assert.equal(ownedInsightUse(""), "unknown");
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

  it("drops ingredients with a blank gloss", () => {
    const card = parseWardrobeProductInsight({
      what_it_does: "Dầu dừa thường dùng để dưỡng ẩm cho da.",
      fit: { verdict: "no", reason: "Có thể chưa hợp." },
      buy: { advice: "chưa nên", why: "Cân nhắc món khác." },
      actives: [
        { name: "Niacinamide", gloss: "" },
        { name: "Dầu dừa", gloss: "   " },
        { name: "BHA", gloss: "làm thông lỗ chân lông" },
      ],
    });
    assert.ok(card);
    assert.deepEqual(card.actives, [{ name: "BHA", gloss: "làm thông lỗ chân lông" }]);

    const none = parseWardrobeProductInsight({
      what_it_does: "Dầu dừa thường dùng để dưỡng ẩm cho da.",
      fit: { verdict: "no", reason: "Có thể chưa hợp." },
      buy: { advice: "chưa nên", why: "Cân nhắc món khác." },
      actives: [
        { name: "Niacinamide", gloss: "" },
        { name: "Dầu dừa", gloss: " " },
      ],
    });
    assert.ok(none);
    assert.equal(none.actives, undefined);
  });

  it("reads the new unknown advice and the legacy not-enough-info card", () => {
    const fresh = parseWardrobeProductInsight({
      what_it_does: "Kem dưỡng thường dùng để dưỡng ẩm cho da.",
      fit: { verdict: "maybe", reason: "Chưa đủ thông tin để so. Soi da một lần để app trả lời rõ hơn." },
      buy: { advice: "chưa biết", why: "Câu từ máy chủ." },
    });
    assert.ok(fresh);
    assert.equal(fresh.buy.advice, "chưa biết");
    assert.equal(ownedInsightUse(fresh.buy.advice, fresh.buy.why), "unknown");

    const legacy = parseWardrobeProductInsight({
      what_it_does: "Kem dưỡng thường dùng để dưỡng ẩm cho da.",
      fit: { verdict: "maybe", reason: "Chưa đủ thông tin để so. Soi da một lần để app trả lời rõ hơn." },
      buy: { advice: "chưa nên", why: LEGACY_UNKNOWN_BUY_WHY },
    });
    assert.ok(legacy);
    assert.equal(legacy.buy.advice, "chưa nên");
    assert.equal(legacy.buy.why, LEGACY_UNKNOWN_BUY_WHY);
    assert.equal(ownedInsightUse(legacy.buy.advice, legacy.buy.why), "unknown");
  });

  it("keeps a real pause verdict when the why is not the not-enough-info sentence", () => {
    const card = parseWardrobeProductInsight({
      what_it_does: "Kem dưỡng nhẹ.",
      fit: { verdict: "no", reason: "Da đang rát." },
      buy: { advice: "chưa nên", why: "Da đang rát, tạm dừng đã." },
    });
    assert.ok(card);
    assert.equal(card.buy.advice, "chưa nên");
    assert.equal(ownedInsightUse(card.buy.advice, card.buy.why), "pause");
  });

  it("does not drop the card when advice is an unrecognized token", () => {
    const card = parseWardrobeProductInsight({
      what_it_does: "Kem dưỡng nhẹ.",
      fit: { verdict: "maybe", reason: "Chưa đủ check-in." },
      buy: { advice: "later", why: "Chưa rõ." },
    });
    assert.ok(card);
    assert.equal(card.buy.advice, "later");
    assert.equal(ownedInsightUse(card.buy.advice, card.buy.why), "unknown");
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
