import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  formatAffiliateCatalog,
  parseAffiliateCsv,
  parseFitNote,
  parseOptionalPrice,
  parseRequiredPrice,
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
    assert.equal(catalog.items.length, 17);

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
    assert.deepEqual(blemish.fit, ["acne"]);

    const steps = [...new Set(catalog.items.map((item) => item.step))].sort();
    assert.deepEqual(steps, [
      "cleanser",
      "makeup_remover",
      "moisturizer",
      "serum",
      "sunscreen",
      "support",
    ]);
    assert.ok(catalog.items.every((item) => item.affLink.startsWith("https://s.shopee.vn/")));
    assert.ok(catalog.items.every((item) => item.affLink !== item.url));
  });

  it("matches the committed JSON, so a weekly import is one command", () => {
    const csv = readFileSync(path.join(root, "data/affiliate/w20261124.csv"), "utf8");
    const committed = readFileSync(path.join(root, "lib/affiliate/products.json"), "utf8");
    assert.equal(committed, formatAffiliateCatalog(parseAffiliateCsv(csv)));
  });
});
