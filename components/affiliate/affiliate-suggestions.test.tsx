import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";

import vi from "../../messages/vi.json";
import type { AffiliateMatchInput } from "@/lib/affiliate/types";

import { AffiliateSuggestionSection } from "./affiliate-suggestions";

function renderSection(input: AffiliateMatchInput) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="vi" messages={vi} timeZone="Asia/Ho_Chi_Minh">
      <AffiliateSuggestionSection input={input} />
    </NextIntlClientProvider>,
  );
}

const oily: AffiliateMatchInput = {
  userId: "oily-acne",
  dayKey: "2026-11-24",
  skinTypes: ["oily"],
  concerns: ["acne", "oil"],
  ownedSteps: [],
  severe: false,
  avoidAcid: false,
  cabinetKnown: true,
};

describe("AffiliateSuggestionSection", () => {
  it("renders 1–3 shop links and never the product-page url", () => {
    const html = renderSection(oily);
    assert.match(html, /Gợi ý cho da bạn/);
    assert.match(html, /Link tiếp thị/);
    assert.match(html, /DaDiary có thể nhận hoa hồng nhỏ khi bạn mua qua link này, giá bạn trả không đổi\./);
    assert.equal(html.includes("Chính hãng"), false);
    assert.match(html, /Vì sao hợp với bạn/);
    assert.match(html, /Xem trên Shopee/);
    assert.match(html, /Xem thêm/);
    assert.match(html, /Giá tham khảo \(24\/11\): 333\.000đ/);
    assert.match(html, /4,9★ · đã bán 2 triệu\+/);
    assert.match(html, /đã bán 500 nghìn\+/);
    assert.equal(html.includes("2tr+"), false);
    assert.equal(html.includes("500k+"), false);
    assert.match(html, /rel="sponsored noopener noreferrer"/);
    assert.match(html, /target="_blank"/);
    const disclosureAt = html.indexOf("DaDiary có thể nhận hoa hồng");
    const firstProductAt = html.indexOf("CeraVe Foaming");
    assert.ok(disclosureAt >= 0 && disclosureAt < firstProductAt);
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]!);
    assert.equal(hrefs.length, 2);
    assert.ok(hrefs.every((href) => /^https:\/\/s\.shopee\.vn\/[A-Za-z0-9]+$/.test(href)));
    assert.equal(html.includes("shopee.vn/product"), false);
    assert.equal(html.includes("line-through"), false);
    assert.equal(html.includes("8.5%"), false);
  });

  it("shows only the dermatologist line for a severe case", () => {
    const html = renderSection({ ...oily, severe: true });
    assert.match(html, /nên nhờ bác sĩ da liễu/);
    assert.equal(html.includes("s.shopee.vn"), false);
    assert.equal(html.includes("Xem trên Shopee"), false);
    assert.equal(html.includes("shopee.vn/product"), false);
  });
});
