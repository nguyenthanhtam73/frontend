import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ProductGuidanceItemDTO } from "@/lib/types/product-guidance";

import { enrichProductGuidanceItems, plainifyGuidanceText } from "./enrich-product-guidance";

describe("plainifyGuidanceText", () => {
  it("keeps ceramide and says what it does", () => {
    assert.equal(
      plainifyGuidanceText("Kem dưỡng ceramide", false),
      "Kem dưỡng ceramide (giúp lớp ngoài da giữ nước, đỡ khô rát)",
    );
  });

  it("explains hàng rào bảo vệ da as plain lớp ngoài da", () => {
    assert.equal(
      plainifyGuidanceText("Phục hồi hàng rào bảo vệ da", false),
      "Phục hồi lớp ngoài da",
    );
    assert.equal(plainifyGuidanceText("Giữ hàng rào da khoẻ, đỡ khô rát", false), "Giữ lớp ngoài da khoẻ, đỡ khô rát");
  });

  it("explains hàng rào da in any case without parentheses", () => {
    assert.equal(plainifyGuidanceText("Hàng rào da đang yếu", false), "Lớp ngoài da đang yếu");
    assert.equal(plainifyGuidanceText("HÀNG RÀO DA đang yếu", false), "Lớp ngoài da đang yếu");
  });

  it("does not nest or stack parentheses", () => {
    assert.equal(plainifyGuidanceText("CeraVe (ceramide)", false), "CeraVe (ceramide)");
    assert.equal(
      plainifyGuidanceText("Củng cố hàng rào da (lớp ngoài cùng)", false),
      "Củng cố lớp ngoài da (lớp ngoài cùng)",
    );
    assert.equal((plainifyGuidanceText("CeraVe (ceramide)", false).match(/\(/g) ?? []).length, 1);
    assert.equal(
      (plainifyGuidanceText("Củng cố hàng rào da (lớp ngoài cùng)", false).match(/\(/g) ?? []).length,
      1,
    );
  });

  it("explains only the first ceramide name, and skips giúp or giữ", () => {
    const twice = plainifyGuidanceText("ceramide buổi sáng và ceramide buổi tối", false);
    assert.equal(
      twice,
      "ceramide (giúp lớp ngoài da giữ nước, đỡ khô rát) buổi sáng và ceramide buổi tối",
    );
    assert.equal(plainifyGuidanceText("ceramide giúp da giữ nước", false), "ceramide giúp da giữ nước");
    assert.equal(plainifyGuidanceText("ceramide giữ ẩm", false), "ceramide giữ ẩm");
  });

  it("treats ceramide NP/AP/EOP and ceramides as one name", () => {
    assert.equal(
      plainifyGuidanceText("ceramide NP/AP/EOP", false),
      "ceramide NP/AP/EOP (giúp lớp ngoài da giữ nước, đỡ khô rát)",
    );
    assert.equal(
      plainifyGuidanceText("ceramides", false),
      "ceramides (giúp lớp ngoài da giữ nước, đỡ khô rát)",
    );
    assert.equal(plainifyGuidanceText("ceramides", false).includes("ceramide ("), false);
  });

  it("still explains a name when a colon follows", () => {
    assert.equal(
      plainifyGuidanceText("Có ceramides: sạch nhẹ", false),
      "Có ceramides (giúp lớp ngoài da giữ nước, đỡ khô rát): sạch nhẹ",
    );
  });
});

describe("enrichProductGuidanceItems", () => {
  it("does not rename the product", () => {
    const item: ProductGuidanceItemDTO = {
      step: "moisturize",
      phase: "calm_first",
      category: "moisturizer",
      name_or_category: "Kem dưỡng ceramide",
      why: "Phục hồi hàng rào bảo vệ da",
      benefits: ["Giữ ẩm"],
      how_to_use: "Thoa một lớp.",
    };
    const [enriched] = enrichProductGuidanceItems([item], { locale: "vi" });
    assert.equal(enriched?.name_or_category, "Kem dưỡng ceramide");
    assert.equal(enriched?.why, "Phục hồi lớp ngoài da");
  });
});
