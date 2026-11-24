import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, it } from "node:test";

import { BeDaXuShop, XuShopPopup, type ShopDialog, type ShopShelf } from "@/components/mascot/game/be-da-xu-shop";
import { applyShopReceipt, type ShopCatalog } from "@/lib/mascot/game/xu-shop";
import { sampleShopCatalog } from "@/lib/mascot/game/xu-shop-sample";
import vi from "../../../messages/vi.json";

const noop = () => undefined;

function collectShopStrings(value: unknown, out: string[]) {
  if (typeof value === "string") {
    out.push(value);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const child of Object.values(value)) collectShopStrings(child, out);
}

function shopHtml(extra: { dialog?: ShopDialog; balance?: number; catalog?: ShopCatalog; shelf?: ShopShelf; tryingId?: string } = {}) {
  const catalog = extra.catalog ?? sampleShopCatalog(extra.balance ?? 5240);
  const trying =
    extra.tryingId === ""
      ? null
      : { id: extra.tryingId ?? "spa_03", artId: extra.tryingId ?? "spa_03", name: "Dép lông", price: 5000, setName: "Spa Sáng Sớm", layer: "shoes" };
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="vi" messages={vi} timeZone="Asia/Ho_Chi_Minh">
      <BeDaXuShop
        catalog={catalog}
        locale="vi"
        gender="female"
        pending={false}
        trying={trying}
        dialog={extra.dialog ?? null}
        problem={null}
        shelf={extra.shelf}
        onClose={noop}
        onTry={noop}
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
    assert.match(html, /data-testid="beda-xu-tab-clothes"/);
    assert.match(html, /data-testid="beda-xu-tab-accessories"/);
    assert.match(html, /data-testid="beda-xu-tab-stickers"/);
    assert.match(html, /data-testid="beda-xu-tab-seeds"/);
    assert.match(html, /Quần áo/);
    assert.match(html, /Phụ kiện/);
    assert.match(html, /Nhãn dán/);
    assert.match(html, /Hạt giống/);
    assert.equal(html.includes("beda-shop-genders"), false);
    assert.equal(html.includes(">Nữ<"), false);
    assert.equal(html.includes(">Nam<"), false);
    assert.match(html, /data-testid="beda-xu-preview"/);
    assert.match(html, /data-testid="beda-xu-wear-layer"/);
    assert.match(html, /xu_spa_dep_long\.svg/);
    assert.match(html, /Đang thử/);
    assert.match(html, /data-zoom="off"/);
    assert.equal(html.includes("is-zoom"), false);
    assert.equal(html.includes('data-testid="beda-xu-speech"'), false);
    assert.equal(html.includes("Tao thấy hợp Bé Da"), false);
    assert.equal(html.includes('data-testid="beda-xu-decor"'), false);
    assert.match(html, /beda-shop-pill is-xu/);
    assert.match(html, /xu_coin\.svg/);
    assert.equal(html.includes(">●<"), false);
    assert.equal(html.includes("Bộ Spa Sáng Sớm"), false);
    assert.equal(html.includes("Ly trà hoa cúc"), false);
    assert.equal(html.includes("Bình tưới mini"), false);
    assert.match(html, /data-testid="beda-xu-seasonal"/);
    assert.match(html, /Đồ mùa chỉ có trong hộp quà/);
    assert.equal(html.includes("Chỉ mở từ hộp quà"), false);
    assert.match(html, /Không mua bằng xu/);
    const shopLines: string[] = [];
    collectShopStrings(vi.mascot.game.shop, shopLines);
    assert.deepEqual(
      shopLines.filter((line) => /\bbạn\b|\bmình\b/i.test(line)),
      [],
    );
    assert.ok((shopLines.join("\n").match(/mày/gi)?.length ?? 0) <= 2);
    assert.match(html, /5\.240 xu/);
    assert.match(html, /data-testid="beda-xu-card-spa_01"[\s\S]*Đã có/);
    assert.equal(html.includes('data-testid="beda-xu-buy-spa_01"'), false);
    assert.match(html, /data-testid="beda-xu-buy-spa_03"/);
    assert.match(html, /Cần chuỗi 30 ngày/);
    const seeds = shopHtml({ shelf: "seeds", tryingId: "" });
    assert.match(seeds, /Hoa anh đào/);
    assert.match(seeds, /data-testid="beda-xu-card-seed_cherry"/);
    const stickers = shopHtml({ shelf: "stickers", tryingId: "shop_bubble_kem_hong" });
    assert.match(stickers, /Nhãn dán hoa/);
    assert.match(stickers, /Bóng chat lá/);
    assert.equal(stickers.includes("Bong bóng"), false);
    assert.match(stickers, /data-testid="beda-xu-card-shop_bubble_kem_hong"/);
    assert.equal(stickers.includes('data-testid="beda-xu-colour-kem_hong"'), false);
    assert.equal(stickers.includes("kem_hong.png"), false);
    const pink = stickers.split('data-testid="beda-xu-card-shop_bubble_kem_hong"').length - 1;
    assert.equal(pink, 1);
    assert.equal((stickers.match(/beda-shop-piece-name" title="Bóng kem hồng"/g) ?? []).length, 1);
    assert.match(stickers, /data-testid="beda-xu-stage-bubble"/);
    assert.match(stickers, /data-bubble="kem_hong"/);
    assert.match(stickers, /Chào nha/);
    assert.match(stickers, /title="Bóng kem hồng"/);
    const hoa = shopHtml({ shelf: "stickers", tryingId: "shop_sticker_hoa" });
    assert.match(hoa, /data-testid="beda-xu-decor"/);
    assert.match(hoa, /daily_hoa\.svg/);
    assert.equal(hoa.includes('data-testid="beda-xu-stage-bubble"'), false);
    assert.match(stickers, /Đồ trang trí/);
    assert.match(stickers, /Không mặc lên người/);
    assert.equal(stickers.includes("Đang thử"), false);
    assert.equal(stickers.includes("Tao thấy hợp Bé Da"), false);
    assert.equal(stickers.includes('data-testid="beda-xu-speech"'), false);
    const accessories = shopHtml({ shelf: "accessories", tryingId: "" });
    assert.match(accessories, /Ly trà hoa cúc/);
    assert.match(accessories, /Bình tưới mini/);
    assert.match(accessories, /Kính tròn/);
    assert.equal(/gacha/i.test(html), false);
    assert.match(html, /không ảnh hưởng nhật ký da của mày đâu/);
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
    assert.match(short, /Đang có 4\.120 xu/);
    assert.equal(short.includes("Bạn đang có"), false);
    assert.match(short, /4\.120 xu/);
    assert.match(short, /6\.500 xu/);
    assert.match(short, /Còn thiếu 2\.380 xu\. Chăm da và tưới cây mỗi ngày để góp thêm xu nha\./);
    assert.equal(/ngày nữa/.test(short), false);
    const tiny = shopHtml({
      balance: 0,
      dialog: { kind: "short", name: "Nhãn dán hoa", charge: 300, balance: 0 },
    });
    assert.match(tiny, /Còn thiếu 300 xu\. Chăm da và tưới cây mỗi ngày để góp thêm xu nha\./);
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
    assert.match(success, /data-testid="beda-xu-speech"/);
    assert.match(success, /Tao để món này cho Bé Da của mày rồi/);
    assert.equal(success.includes("Tao thấy hợp Bé Da"), false);
    assert.match(success, /Đổi xong rồi!/);
    assert.match(success, /Tao để món này cho Bé Da của mày rồi/);
    assert.match(success, /Còn 240 xu/);
    assert.match(success, /data-testid="beda-xu-success-wear"/);
    assert.match(success, /Mặc luôn/);
    assert.equal(/gacha/i.test(confirm + short + success), false);
    assert.match(short, /data-testid="beda-xu-miss-spa_03"/);
    assert.match(short, /Còn thiếu 880 xu/);
  });

  it("draws the shop as a dialog the room can close", () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="vi" messages={vi} timeZone="Asia/Ho_Chi_Minh">
        <XuShopPopup title="Cửa hàng xu" closeLabel="Đóng cửa hàng" onClose={noop}>
          <p>Cửa hàng</p>
        </XuShopPopup>
      </NextIntlClientProvider>,
    );
    assert.match(html, /data-testid="beda-xu-popup"/);
    assert.match(html, /data-testid="beda-xu-backdrop"/);
    assert.match(html, /data-testid="beda-xu-close"/);
    assert.match(html, /role="dialog"/);
    assert.match(html, /aria-modal="true"/);
    assert.match(html, /aria-label="Đóng cửa hàng"/);
    assert.equal(/gacha/i.test(html), false);
  });
});
