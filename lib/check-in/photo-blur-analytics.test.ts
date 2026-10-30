import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { FUNNEL_EVENTS } from "@/lib/analytics/funnel";
import { FIRST_PARTY_FUNNEL_EVENTS } from "@/lib/analytics/funnel-events";

import {
  buildPhotoBlurChoiceProps,
  buildPhotoBlurShownProps,
  reportPhotoBlurChoice,
  reportPhotoBlurShown,
  roundBlurScore,
} from "./photo-blur-analytics";

type MemStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function memoryStore(): MemStore {
  const map = new Map<string, string>();
  return {
    getItem: (key) => (map.has(key) ? map.get(key)! : null),
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

describe("photo blur analytics", () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalSession = globalThis.sessionStorage;
  const originalLocal = globalThis.localStorage;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    Object.assign(globalThis, {
      window: originalWindow,
      sessionStorage: originalSession,
      localStorage: originalLocal,
    });
  });

  it("rounds the score and keeps props free of photo urls", () => {
    assert.equal(roundBlurScore(0.1234), 0.12);
    assert.equal(roundBlurScore(0.126), 0.13);
    assert.equal(roundBlurScore(Number.NaN), 0);

    const shown = buildPhotoBlurShownProps(1, 0.086);
    assert.deepEqual(shown, { slot: 1, score: 0.09 });
    assert.deepEqual(Object.keys(shown).sort(), ["score", "slot"]);

    const choice = buildPhotoBlurChoiceProps({
      slot: 0,
      score: 0.0412,
      choice: "send_anyway",
      via: "submit",
    });
    assert.deepEqual(choice, {
      slot: 0,
      score: 0.04,
      choice: "send_anyway",
      via: "submit",
    });
    assert.equal(JSON.stringify(choice).includes("blob:"), false);
    assert.equal(JSON.stringify(choice).includes("http"), false);
  });

  it("fires shown and choice through Meta/TikTok funnel names and the backend ingest", async () => {
    const session = memoryStore();
    const local = memoryStore();
    const win = {
      location: { pathname: "/check-in" },
      sessionStorage: session,
      localStorage: local,
      __dadiaryFunnel: [] as { name: string; params?: Record<string, unknown> }[],
      dataLayer: [] as Record<string, unknown>[],
    };
    Object.assign(globalThis, {
      window: win,
      sessionStorage: session,
      localStorage: local,
    });

    const bodies: string[] = [];
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(String(init?.body ?? ""));
      return new Response("", { status: 204 });
    }) as typeof fetch;

    const context = { never_checked_in: true, skip_mode: false, signed_in: true };
    reportPhotoBlurShown(0, 0.086, context);
    reportPhotoBlurChoice(
      { slot: 0, score: 0.086, choice: "retake", via: "button" },
      context,
    );

    assert.equal(win.__dadiaryFunnel[0]?.name, FUNNEL_EVENTS.checkInPhotoBlurShown);
    assert.deepEqual(win.__dadiaryFunnel[0]?.params, { slot: 0, score: 0.09 });
    assert.equal(win.__dadiaryFunnel[1]?.name, FUNNEL_EVENTS.checkInPhotoBlurChoice);
    assert.deepEqual(win.__dadiaryFunnel[1]?.params, {
      slot: 0,
      score: 0.09,
      choice: "retake",
      via: "button",
    });

    await Promise.resolve();
    assert.equal(bodies.length, 2);
    const shown = JSON.parse(bodies[0]!) as {
      event: string;
      props: Record<string, unknown>;
    };
    const choice = JSON.parse(bodies[1]!) as {
      event: string;
      props: Record<string, unknown>;
    };
    assert.equal(shown.event, FIRST_PARTY_FUNNEL_EVENTS.checkInPhotoBlurShown);
    assert.equal(choice.event, FIRST_PARTY_FUNNEL_EVENTS.checkInPhotoBlurChoice);
    assert.deepEqual(shown.props, {
      never_checked_in: true,
      skip_mode: false,
      signed_in: true,
      slot: 0,
      score: 0.09,
    });
    assert.equal(JSON.stringify(shown.props).includes("blob:"), false);
    assert.equal(JSON.stringify(choice.props).includes("url"), false);
  });

  it("does not throw when there is no window", () => {
    Object.assign(globalThis, { window: undefined });
    assert.doesNotThrow(() => reportPhotoBlurShown(0, 0.2));
    assert.doesNotThrow(() =>
      reportPhotoBlurChoice({ slot: 1, score: 0.2, choice: "send_anyway", via: "submit" }),
    );
  });
});
