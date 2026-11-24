import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";

import vi from "../../messages/vi.json";
import { affiliateCatalog } from "@/lib/affiliate/catalog";
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
  cabinetKnown: true,
};

describe("AffiliateSuggestionSection", () => {
  it("renders 1–3 shop links and never the product-page url", () => {
    const html = renderSection(oily);
    assert.match(html, /Gợi ý cho da bạn/);
    assert.match(html, /Link tiếp thị/);
    assert.match(html, /DaDiary có thể nhận hoa hồng nhỏ khi bạn mua qua link này, giá bạn trả không đổi\./);
    assert.match(html, /Chính hãng/);
    assert.match(html, /Vì sao hợp với bạn/);
    assert.match(html, /Xem trên Shopee/);
    assert.match(html, /Giá tham khảo: 333\.000đ/);
    assert.match(html, /4,9★ · đã bán 2tr\+/);
    assert.match(html, /rel="sponsored noopener noreferrer"/);
    assert.match(html, /target="_blank"/);
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((match) => match[1]!);
    assert.ok(hrefs.length >= 1 && hrefs.length <= 3);
    assert.ok(hrefs.every((href) => href.startsWith("https://s.shopee.vn/")));
    for (const item of affiliateCatalog.items) {
      assert.equal(html.includes(item.url), false);
    }
    assert.equal(html.includes("line-through"), false);
  });

  it("shows only the dermatologist line for a severe case", () => {
    const html = renderSection({ ...oily, severe: true });
    assert.match(html, /nên nhờ bác sĩ da liễu/);
    assert.equal(html.includes("s.shopee.vn"), false);
    assert.equal(html.includes("Xem trên Shopee"), false);
    assert.equal(html.includes("shopee.vn/product"), false);
  });
});
