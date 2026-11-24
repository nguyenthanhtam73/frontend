import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  formatAffiliateCatalog,
  isAcidProduct,
  parseAffiliateCsv,
  parseCommissionPercent,
  parseFitNote,
  parseOptionalPrice,
  parseBanChay,
  parseRequiredPrice,
  toPublicCatalog,
} from "./affiliate-import.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("affiliate CSV import", () => {
  it("strips the trailing note into fit tags", () => {
    assert.deepEqual(parseFitNote("CeraVe Foaming Cleanser 236ml (da dầu)"), {
      name: "CeraVe Foaming Cleanser 236ml",
      fit: ["oily"],
    });
    assert.deepEqual(parseFitNote("CeraVe Hydrating Cleanser 473ml (da khô/thường)"), {
      name: "CeraVe Hydrating Cleanser 473ml",
      fit: ["dry", "normal"],
    });
    assert.deepEqual(parseFitNote("CeraVe Blemish Control Cleanser 473ml (da mụn)"), {
      name: "CeraVe Blemish Control Cleanser 473ml",
      fit: ["acne"],
    });
    assert.deepEqual(parseFitNote("Some By Mi AHA-BHA-PHA 30 Days Serum 50ml (mụn)"), {
      name: "Some By Mi AHA-BHA-PHA 30 Days Serum 50ml",
      fit: ["acne"],
    });
    assert.deepEqual(parseFitNote("Paula's Choice 2% BHA Liquid Exfoliant 30ml (lỗ chân lông/mụn)"), {
      name: "Paula's Choice 2% BHA Liquid Exfoliant 30ml",
      fit: ["pores", "acne"],
    });
    assert.deepEqual(parseFitNote("La Roche-Posay Mela B3 Micro-Peeling Gel 200ml (thâm sạm)"), {
      name: "La Roche-Posay Mela B3 Micro-Peeling Gel 200ml",
      fit: ["dark_spots"],
    });
    assert.deepEqual(parseFitNote("Some By Mi Snail TrueCica Repair Serum 50ml (phục hồi)"), {
      name: "Some By Mi Snail TrueCica Repair Serum 50ml",
      fit: ["barrier"],
    });
    assert.deepEqual(parseFitNote("Skin1004 Centella Hyalu-Cica Serum 50ml (cấp ẩm/dịu da)"), {
      name: "Skin1004 Centella Hyalu-Cica Serum 50ml",
      fit: ["hydration", "sensitive"],
    });
    assert.deepEqual(parseFitNote("Senka Perfect Whip 120g (giá mềm)"), {
      name: "Senka Perfect Whip 120g",
      fit: ["budget"],
    });
  });

  it("keeps a name with no note as a general item", () => {
    assert.deepEqual(parseFitNote("CeraVe Moisturising Cream 50ml"), {
      name: "CeraVe Moisturising Cream 50ml",
      fit: [],
    });
  });

  it("parses VND amounts and treats an empty original price as null", () => {
    assert.equal(parseRequiredPrice("333000", "gia_vnd"), 333000);
    assert.equal(parseOptionalPrice("350000"), 350000);
    assert.equal(parseOptionalPrice(""), null);
    assert.equal(parseOptionalPrice("   "), null);
    assert.throws(() => parseOptionalPrice("333.000"), /Invalid VND/);
    assert.throws(() => parseRequiredPrice("", "gia_vnd"), /Missing gia_vnd/);
  });

  it("converts the weekly batch: steps, numbers, empty gia_goc, and aff links", () => {
    const csv = readFileSync(path.join(root, "data/affiliate/w20261124.csv"), "utf8");
    const catalog = parseAffiliateCsv(csv);
    assert.equal(catalog.batch, "w20261124");
    assert.equal(catalog.items.length, 15);

    const foaming = catalog.items[0];
    assert.equal(foaming.step, "cleanser");
    assert.equal(foaming.priceVnd, 333000);
    assert.equal(foaming.originalPriceVnd, 350000);
    assert.equal(foaming.commission, "8.5%");
    assert.equal(foaming.rating, 4.9);
    assert.equal(foaming.reviewCount, "31k");
    assert.equal(foaming.sold, "2tr+");
    assert.equal(foaming.affLink, "https://s.shopee.vn/8KrJwSODJy");
    assert.notEqual(foaming.affLink, foaming.url);

    const blemish = catalog.items.find((item) => item.name.includes("Blemish"));
    assert.equal(blemish.originalPriceVnd, null);
    assert.equal(blemish.acid, false);
    assert.deepEqual(blemish.fit, ["acne"]);
    assert.equal(catalog.items.find((item) => item.name.includes("AHA-BHA-PHA")), undefined);
    assert.equal(catalog.items.find((item) => item.name.includes("Bioderma")), undefined);
    assert.equal(isAcidProduct("Some By Mi AHA-BHA-PHA 30 Days Serum 50ml"), true);
    assert.equal(catalog.items.find((item) => item.name.includes("Paula")).acid, true);
    assert.equal(catalog.items.find((item) => item.name.includes("Micro-Peeling")).acid, true);
    assert.ok(catalog.items.every((item) => parseCommissionPercent(item.commission) > 8));

    const steps = [...new Set(catalog.items.map((item) => item.step))].sort();
    assert.deepEqual(steps, ["cleanser", "moisturizer", "serum", "sunscreen", "support"]);
    assert.ok(catalog.items.every((item) => item.affLink.startsWith("https://s.shopee.vn/")));
    assert.ok(catalog.items.every((item) => item.affLink !== item.url));
  });

  it("matches the committed JSON, so a weekly import is one command", () => {
    const csv = readFileSync(path.join(root, "data/affiliate/w20261124.csv"), "utf8");
    const committed = readFileSync(path.join(root, "lib/affiliate/products.json"), "utf8");
    assert.equal(committed, formatAffiliateCatalog(parseAffiliateCsv(csv)));
    assert.equal(committed.includes("commission"), false);
    assert.equal(committed.includes("reviewCount"), false);
    assert.equal(committed.includes("subId1"), false);
    assert.equal(committed.includes("ban_chay"), false);
    assert.equal(committed.includes("banChay"), false);
    assert.equal(committed.includes("shopee.vn/product"), false);
  });

  it("rejects a bad link, a bad url, a wrong sub_id1, and a duplicate, naming the row", () => {
    const header =
      "nhom,ten,gia_vnd,gia_goc_vnd,hoa_hong,sao,danh_gia,da_ban,shop,url,aff_link,sub_id1,sub_id2,ban_chay";
    const good =
      "Sữa rửa mặt,CeraVe Foaming,333000,,8.5%,4.9,31k,2tr+,Shop,https://shopee.vn/product/1/2,https://s.shopee.vn/abcDEF12,dadiary,w20261124,0";
    assert.throws(
      () =>
        parseAffiliateCsv(
          `${header}\nSữa rửa mặt,Bad,1000,,8%,4.9,1,1,Shop,https://shopee.vn/product/1/2,https://shopee.vn/nope,dadiary,w20261124,0\n`,
        ),
      /Row 2:.*aff_link/,
    );
    assert.throws(
      () =>
        parseAffiliateCsv(
          `${header}\nSữa rửa mặt,Bad,1000,,8%,4.9,1,1,Shop,https://example.com/nope,https://s.shopee.vn/abc,dadiary,w20261124,0\n`,
        ),
      /Row 2:.*url must start/,
    );
    assert.throws(
      () =>
        parseAffiliateCsv(
          `${header}\nSữa rửa mặt,Bad,1000,,8%,4.9,1,1,Shop,https://shopee.vn/product/1/2,https://s.shopee.vn/abc,other,w20261124\n`,
        ),
      /Row 2:.*sub_id1/,
    );
    assert.throws(
      () => parseAffiliateCsv(`${header}\n${good}\n${good}\n`),
      /Row 3:.*duplicate aff_link/,
    );
  });

  it("parses hoa_hong and rejects a row at or below 8%", () => {
    assert.equal(parseCommissionPercent("4,5%"), 4.5);
    assert.equal(parseCommissionPercent("7.5%"), 7.5);
    assert.equal(parseCommissionPercent("10%"), 10);
    assert.equal(parseCommissionPercent("8,5%"), 8.5);
    const header =
      "nhom,ten,gia_vnd,gia_goc_vnd,hoa_hong,sao,danh_gia,da_ban,shop,url,aff_link,sub_id1,sub_id2,ban_chay";
    const low =
      'Serum,Some By Mi AHA,1000,,"4,5%",4.9,1,1,Shop,https://shopee.vn/product/1/2,https://s.shopee.vn/lowcomm1,dadiary,w20261124,0';
    assert.throws(() => parseAffiliateCsv(`${header}\n${low}\n`), (error) => {
      assert.match(error.message, /Row 2:.*above 8%/);
      assert.match(error.message, /Some By Mi AHA/);
      assert.match(error.message, /4,5%/);
      return true;
    });
    const eight =
      "Tẩy trang,Bioderma,1000,,8%,4.9,1,1,Shop,https://shopee.vn/product/1/3,https://s.shopee.vn/eightpct,dadiary,w20261124,0";
    assert.throws(() => parseAffiliateCsv(`${header}\n${eight}\n`), /Row 2:.*above 8%.*8%/);
    const seven =
      "Tẩy trang,Bioderma H2O,1000,,7.5%,4.9,1,1,Shop,https://shopee.vn/product/1/4,https://s.shopee.vn/sevenpct,dadiary,w20261124,0";
    assert.throws(() => parseAffiliateCsv(`${header}\n${seven}\n`), (error) => {
      assert.match(error.message, /Row 2:/);
      assert.match(error.message, /7\.5%/);
      assert.match(error.message, /Bioderma H2O/);
      return true;
    });
  });

  it("keeps a low-commission row only when ban_chay is set, and caps the flag at 15", () => {
    assert.equal(parseBanChay(""), false);
    assert.equal(parseBanChay("0"), false);
    assert.equal(parseBanChay("false"), false);
    assert.equal(parseBanChay("1"), true);
    assert.equal(parseBanChay("true"), true);
    const header =
      "nhom,ten,gia_vnd,gia_goc_vnd,hoa_hong,sao,danh_gia,da_ban,shop,url,aff_link,sub_id1,sub_id2,ban_chay";
    const flagged =
      'Serum,Best seller,1000,,"4,5%",4.9,10,2tr+,Shop,https://shopee.vn/product/1/9,https://s.shopee.vn/bestsell,dadiary,w20261124,1';
    const plain =
      "Sữa rửa mặt,Full rate,1000,,10%,4.9,10,2tr+,Shop,https://shopee.vn/product/1/8,https://s.shopee.vn/fullrate,dadiary,w20261124,0";
    const catalog = parseAffiliateCsv(`${header}\n${flagged}\n${plain}\n`);
    assert.equal(catalog.items.length, 2);
    assert.equal(catalog.items[0].banChay, true);
    const published = JSON.stringify(toPublicCatalog(catalog));
    assert.equal(published.includes("ban_chay"), false);
    assert.equal(published.includes("banChay"), false);
    assert.equal(published.includes("commission"), false);
    assert.equal(catalog.items[0].popularity, catalog.items[1].popularity);

    const many = [header];
    for (let i = 0; i < 16; i += 1) {
      many.push(
        `Sữa rửa mặt,Flag ${i},1000,,4%,4.9,1,1,Shop,https://shopee.vn/product/9/${i},https://s.shopee.vn/flag${i},dadiary,w20261124,1`,
      );
    }
    assert.throws(() => parseAffiliateCsv(many.join("\n")), /Too many ban_chay rows: 16/);
  });

  it("keeps a batch that simply has no rows for one step", () => {
    const header =
      "nhom,ten,gia_vnd,gia_goc_vnd,hoa_hong,sao,danh_gia,da_ban,shop,url,aff_link,sub_id1,sub_id2,ban_chay";
    const row = (group, id) =>
      `${group},Name ${id},1000,,10%,4.9,1,1,Shop,https://shopee.vn/product/1/${id},https://s.shopee.vn/${id},dadiary,w20261124,0`;
    const csv = [
      header,
      row("Sữa rửa mặt", "clean1"),
      row("Serum", "serum1"),
      row("Kem dưỡng", "moist1"),
      row("Chống nắng", "sun001"),
    ].join("\n");
    const catalog = parseAffiliateCsv(csv);
    assert.equal(catalog.items.some((item) => item.step === "makeup_remover"), false);
    assert.equal(catalog.items.some((item) => item.step === "support"), false);
    assert.equal(catalog.items.length, 4);
  });

  it("exits non-zero and prints the row when the CSV is invalid", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "aff-"));
    const csvPath = path.join(dir, "bad.csv");
    writeFileSync(
      csvPath,
      "nhom,ten,gia_vnd,gia_goc_vnd,hoa_hong,sao,danh_gia,da_ban,shop,url,aff_link,sub_id1,sub_id2,ban_chay\n" +
        "Sữa rửa mặt,Bad link,1000,,8%,4.9,1,1,Shop,https://shopee.vn/product/1/2,https://shopee.vn/nope,dadiary,w20261124,0\n",
    );
    const result = spawnSync(process.execPath, [path.join(root, "scripts/affiliate-import.mjs"), csvPath], {
      encoding: "utf8",
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Row 2:/);
    assert.match(result.stderr, /https:\/\/shopee\.vn\/nope/);
  });
});
