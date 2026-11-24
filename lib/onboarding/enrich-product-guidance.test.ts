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

  it("explains hàng rào bảo vệ da instead of swapping the words", () => {
    assert.equal(
      plainifyGuidanceText("Phục hồi hàng rào bảo vệ da", false),
      "Phục hồi lớp ngoài da (lớp giữ nước, đỡ khô rát)",
    );
    assert.equal(plainifyGuidanceText("Phục hồi hàng rào bảo vệ da", false).includes("da bảo vệ da"), false);
  });

  it("explains hàng rào da in any case", () => {
    assert.equal(
      plainifyGuidanceText("Hàng rào da đang yếu", false),
      "Lớp ngoài da (lớp giữ nước, đỡ khô rát) đang yếu",
    );
    assert.equal(
      plainifyGuidanceText("HÀNG RÀO DA đang yếu", false),
      "Lớp ngoài da (lớp giữ nước, đỡ khô rát) đang yếu",
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
    assert.equal(enriched?.why, "Phục hồi lớp ngoài da (lớp giữ nước, đỡ khô rát)");
  });
});
