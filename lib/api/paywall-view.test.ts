import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { persistPaywallView } from "./paywall-view";

describe("persistPaywallView", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("POSTs the ingest body and does not throw on success", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init: init ?? {} });
      return new Response(
        JSON.stringify({ success: true, data: { id: "pv_1", logged_at: "2026-09-06T00:00:00Z" } }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    await persistPaywallView({
      surface: "upsell_banner",
      feature: "wardrobe_full",
      recommendedPlan: "premium",
    });

    assert.equal(calls.length, 1);
    assert.match(calls[0]!.url, /\/api\/v1\/analytics\/paywall-view$/);
    assert.equal(calls[0]!.init.method, "POST");
    assert.equal(
      calls[0]!.init.body,
      JSON.stringify({
        surface: "upsell_banner",
        feature: "wardrobe_full",
        recommended_plan: "premium",
      }),
    );
  });

  it("swallows ingest failures", async () => {
    globalThis.fetch = (async () => {
      throw new Error("offline");
    }) as typeof fetch;
    await persistPaywallView({ surface: "pricing", feature: "generic" });
  });
});
