import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildAuthHref,
  buildPricingCheckoutHref,
  buildRegisterCheckoutHref,
  CHECKOUT_INTENT_STORAGE_KEY,
  parseCheckoutIntent,
  persistCheckoutIntent,
  readPersistedCheckoutIntent,
  resolveCheckoutIntent,
  wantsAutoCheckout,
} from "./checkout-intent";

function memoryStore(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key]! : null;
    },
    setItem(key: string, value: string) {
      data[key] = value;
    },
    removeItem(key: string) {
      delete data[key];
    },
  };
}

describe("checkout-intent", () => {
  it("parses paid plans and defaults interval to yearly", () => {
    assert.deepEqual(parseCheckoutIntent("premium", "monthly"), {
      plan: "premium",
      interval: "monthly",
    });
    assert.deepEqual(parseCheckoutIntent("premium_plus", ""), {
      plan: "premium_plus",
      interval: "yearly",
    });
    assert.equal(parseCheckoutIntent("free", "yearly"), null);
    assert.equal(parseCheckoutIntent("nope", "monthly"), null);
  });

  it("builds register and pricing checkout hrefs", () => {
    const intent = { plan: "premium" as const, interval: "yearly" as const };
    assert.equal(buildRegisterCheckoutHref(intent), "/register?plan=premium&interval=yearly");
    assert.equal(
      buildPricingCheckoutHref(intent),
      "/pricing?plan=premium&interval=yearly&checkout=1",
    );
  });

  it("keeps plan + next together on auth hrefs", () => {
    assert.equal(
      buildAuthHref("/login", {
        intent: { plan: "premium_plus", interval: "monthly" },
        next: "/onboarding/coach-welcome",
      }),
      "/login?plan=premium_plus&interval=monthly&next=%2Fonboarding%2Fcoach-welcome",
    );
    assert.equal(buildAuthHref("/register", { next: "https://evil.test" }), "/register");
    assert.equal(
      buildAuthHref("/register", { intent: { plan: "premium", interval: "yearly" } }),
      "/register?plan=premium&interval=yearly",
    );
  });

  it("persists and restores intent from storage", () => {
    const store = memoryStore();
    persistCheckoutIntent({ plan: "premium", interval: "monthly" }, store);
    assert.deepEqual(readPersistedCheckoutIntent(store), {
      plan: "premium",
      interval: "monthly",
    });
    persistCheckoutIntent(null, store);
    assert.equal(store.getItem(CHECKOUT_INTENT_STORAGE_KEY), null);
  });

  it("prefers URL intent and writes it to storage", () => {
    const store = memoryStore();
    persistCheckoutIntent({ plan: "premium", interval: "monthly" }, store);
    const resolved = resolveCheckoutIntent("plan=premium_plus&interval=yearly", store);
    assert.deepEqual(resolved, { plan: "premium_plus", interval: "yearly" });
    assert.deepEqual(readPersistedCheckoutIntent(store), {
      plan: "premium_plus",
      interval: "yearly",
    });
  });

  it("falls back to persisted intent when URL has none", () => {
    const store = memoryStore();
    persistCheckoutIntent({ plan: "premium", interval: "yearly" }, store);
    assert.deepEqual(resolveCheckoutIntent("", store), {
      plan: "premium",
      interval: "yearly",
    });
  });

  it("detects checkout=1", () => {
    assert.equal(wantsAutoCheckout("checkout=1&plan=premium"), true);
    assert.equal(wantsAutoCheckout("plan=premium"), false);
  });
});
