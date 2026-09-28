import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PLAN_PRICES, priceForDisplay } from "./pricing";

describe("priceForDisplay", () => {
  it("shows yearly plans as a round per-month amount but bills the exact yearly total", () => {
    const premium = priceForDisplay("premium", "yearly");
    assert.equal(premium.perMonth, 71_000);
    assert.equal(premium.billedTotal, PLAN_PRICES.premium.yearlyTotal);

    const plus = priceForDisplay("premium_plus", "yearly");
    assert.equal(plus.perMonth, 114_000);
    assert.equal(plus.billedTotal, PLAN_PRICES.premium_plus.yearlyTotal);
  });

  it("keeps monthly prices exact", () => {
    const premium = priceForDisplay("premium", "monthly");
    assert.equal(premium.perMonth, PLAN_PRICES.premium.monthly);
    assert.equal(premium.billedTotal, PLAN_PRICES.premium.monthly);
  });
});
