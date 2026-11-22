import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { QueryClient } from "@tanstack/react-query";

import { commitIntroReset, resetMascotIntro } from "@/lib/api/mascot";
import { mascotQueryKey } from "@/lib/mascot/query-key";
import { defaultSnapshot } from "@/lib/mascot/model";

const originalFetch = globalThis.fetch;

function restore() {
  globalThis.fetch = originalFetch;
  if (typeof navigator !== "undefined") {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  }
}

describe("reset Bé Da intro", { concurrency: false }, () => {
  afterEach(() => {
    restore();
  });

  it("calls DELETE /api/v1/me/mascot/intro and clears introSeen", async () => {
    const calls: { url: string; method: string }[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), method: init?.method ?? "GET" });
      return new Response(JSON.stringify({ success: true, data: { introSeen: false } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const reset = await resetMascotIntro();
    assert.deepEqual(reset, { introSeen: false });
    assert.equal(calls.length, 1);
    assert.match(calls[0]!.url, /\/api\/v1\/me\/mascot\/intro$/);
    assert.equal(calls[0]!.method, "DELETE");

    const client = new QueryClient();
    const seen = { ...defaultSnapshot(), introSeen: true as boolean | null };
    client.setQueryData(mascotQueryKey, seen);
    assert.equal(await commitIntroReset(client), "ok");
    assert.equal(client.getQueryData<{ introSeen: boolean | null }>(mascotQueryKey)?.introSeen, false);
    assert.equal(client.getQueryState(mascotQueryKey)?.isInvalidated, true);
    assert.equal(calls.length, 2);
    assert.equal(calls[1]!.method, "DELETE");
  });

  it("treats a 404 as a gentle miss and leaves the cache", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ success: false, error: { message: "not found" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch;

    const client = new QueryClient();
    client.setQueryData(mascotQueryKey, { ...defaultSnapshot(), introSeen: true });
    assert.equal(await commitIntroReset(client), "missing");
    assert.equal(client.getQueryData<{ introSeen: boolean | null }>(mascotQueryKey)?.introSeen, true);
  });
});
