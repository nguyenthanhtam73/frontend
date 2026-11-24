import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { funnelEventsUrl } from "@/lib/analytics/funnel-events";

import { logAffiliateSuggestionClick } from "./click";

describe("affiliate_click", () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    Object.assign(globalThis, { window: originalWindow });
  });

  it("posts step and batch on the existing funnel helper", async () => {
    const calls: { url: string; body: string }[] = [];
    Object.assign(globalThis, {
      window: { location: { pathname: "/check-in" }, sessionStorage: memoryStore() },
    });
    Object.assign(globalThis, { sessionStorage: memoryStore() });
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), body: String(init?.body ?? "") });
      return new Response("{}", { status: 202 });
    }) as typeof fetch;

    logAffiliateSuggestionClick("sunscreen", "w20261124");
    await Promise.resolve();

    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.url, funnelEventsUrl());
    const body = JSON.parse(calls[0]!.body) as { event: string; props: { step: string; batch: string } };
    assert.equal(body.event, "affiliate_click");
    assert.deepEqual(body.props, { step: "sunscreen", batch: "w20261124" });
  });
});

function memoryStore() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}
