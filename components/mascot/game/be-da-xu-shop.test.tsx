import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, it } from "node:test";

import { BeDaXuShop, type ShopDialog } from "@/components/mascot/game/be-da-xu-shop";
import { applyShopReceipt, type ShopCatalog } from "@/lib/mascot/game/xu-shop";
import { sampleShopCatalog } from "@/lib/mascot/game/xu-shop-sample";
import vi from "../../../messages/vi.json";

const noop = () => undefined;

function shopHtml(extra: { dialog?: ShopDialog; balance?: number; catalog?: ShopCatalog } = {}) {
  const catalog = extra.catalog ?? sampleShopCatalog(extra.balance ?? 5240);
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="vi" messages={vi} timeZone="Asia/Ho_Chi_Minh">
      <BeDaXuShop
        catalog={catalog}
        locale="vi"
        gender="female"
        pending={false}
        trying={{ id: "spa_03", artId: "spa_03", name: "Dép lông", price: 5000, setName: "Spa Sáng Sớm", layer: "shoes" }}
        dialog={extra.dialog ?? null}
        problem={null}
        onClose={noop}
        onGender={noop}
        onTry={noop}
        onClearTry={noop}
        onBuy={noop}
        onConfirm={noop}
        onDismiss={noop}
        onWear={noop}
        onCare={noop}
      />
    </NextIntlClientProvider>,
  );
}

describe("xu shop screen", () => {
  it("shows every group, the season note, prices, and owned pieces", () => {
    const html = shopHtml();
    assert.match(html, /data-testid="beda-xu-group-sets"/);
    assert.match(html, /data-testid="beda-xu-group-accessories"/);
    assert.match(html, /data-testid="beda-xu-group-seeds"/);
    assert.match(html, /data-testid="beda-xu-group-daily"/);
    assert.match(html, /data-testid="beda-xu-seasonal"/);
    assert.match(html, /Đồ mùa chỉ có trong hộp quà/);
    assert.match(html, /Chỉ mở từ hộp quà/);
    assert.match(html, /Không mua bằng xu/);
    assert.match(html, /Bộ sưu tầm/);
    assert.match(html, /Đồ của mình/);
    assert.match(html, /5\.240 xu/);
    assert.match(html, /data-testid="beda-xu-card-spa_01"[\s\S]*Đã có/);
    assert.equal(html.includes('data-testid="beda-xu-buy-spa_01"'), false);
    assert.match(html, /data-testid="beda-xu-buy-spa_03"/);
    assert.match(html, /Cần chuỗi 30 ngày/);
    assert.match(html, /Hoa anh đào/);
    assert.match(html, /Nhãn dán hoa/);
    assert.match(html, /data-testid="beda-xu-colour-kem_hong"/);
    assert.match(html, /Chào nha/);
    assert.equal(html.includes('data-testid="beda-xu-buy-kem_hong"'), false);
    assert.equal(/gacha/i.test(html), false);
    assert.match(html, /không đổi kết quả da/);
  });

  it("asks before a big debit and says how many xu are missing", () => {
    const confirm = shopHtml({
      dialog: { kind: "confirm", itemId: "spa_03", treeType: "", name: "Dép lông", charge: 5000 },
    });
    assert.match(confirm, /data-testid="beda-xu-confirm"/);
    assert.match(confirm, /Đổi món này\?/);
    assert.match(confirm, /5\.000 xu/);
    const short = shopHtml({
      balance: 4120,
      dialog: { kind: "short", name: "Gối ôm", charge: 6500, balance: 4120 },
    });
    assert.match(short, /data-testid="beda-xu-short"/);
    assert.match(short, /4\.120 xu/);
    assert.match(short, /6\.500 xu/);
    assert.match(short, /2\.380 xu/);
    assert.match(short, /8–10 ngày/);
    assert.match(short, /Đi chăm da/);
    assert.match(short, /Để sau/);
    assert.match(short, /Vẫn mặc thử được miễn phí\./);
    assert.equal(short.includes("không mua bằng tiền"), false);
    assert.equal(/disabled[^>]*>\s*Chưa đủ xu/.test(short), false);
    const paid = applyShopReceipt(sampleShopCatalog(5240), {
      already: false,
      itemId: "spa_03",
      treeType: "",
      charged: 5000,
      balance: 240,
      granted: [{ id: "spa_03", name: "Dép lông", layer: "shoes" }],
      bonusGranted: [],
    });
    const success = shopHtml({
      catalog: paid,
      dialog: {
        kind: "success",
        name: "Dép lông",
        charged: 5000,
        balance: paid.balance,
        already: false,
        bonusName: "",
        piece: { id: "spa_03", name: "Dép lông", layer: "shoes" },
      },
    });
    const pill = success.match(/data-testid="beda-xu-balance"[\s\S]*?<\/span>/)?.[0] ?? "";
    assert.match(pill, /240 xu/);
    assert.equal(pill.includes("5.240"), false);
    const slipper = success.split('data-testid="beda-xu-card-spa_04"')[0]?.split('data-testid="beda-xu-card-spa_03"')[1] ?? "";
    assert.match(slipper, /Đã có/);
    assert.equal(slipper.includes("beda-xu-buy-spa_03"), false);
    assert.match(success, /data-testid="beda-xu-success"/);
    assert.match(success, /Đổi xong rồi!/);
    assert.match(success, /Còn 240 xu/);
    assert.match(success, /data-testid="beda-xu-success-wear"/);
    assert.equal(/gacha/i.test(confirm + short + success), false);
  });
});
