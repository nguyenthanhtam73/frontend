import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { FIRST_TOUCH_STORAGE_KEY } from "./attribution";
import { FUNNEL_EVENTS, trackFunnelEvent } from "./funnel";
import { funnelEventsUrl } from "./funnel-events";
import {
  classifyRegisterClientBlock,
  registerAttributionEventProps,
  registerRequestAttribution,
  trackLandingCtaClick,
  trackRegisterClientError,
  trackRegisterSubmitAttempt,
} from "./register-landing";

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

function installWindow(search: string) {
  const session = memoryStore();
  const local = memoryStore();
  const meta: unknown[][] = [];
  const tiktok: unknown[][] = [];
  const win = {
    location: { pathname: "/register", search, hostname: "dadiary.vn" },
    sessionStorage: session,
    localStorage: local,
    fbq: (...args: unknown[]) => {
      meta.push(args);
    },
    ttq: {
      track: (...args: unknown[]) => {
        tiktok.push(args);
      },
    },
  };
  Object.assign(globalThis, {
    window: win,
    sessionStorage: session,
    localStorage: local,
  });
  return { session, local, meta, tiktok, win };
}

describe("register client errors", () => {
  it("classifies the first field block and never returns the typed text", () => {
    assert.equal(classifyRegisterClientBlock("   ", "short"), "email_empty");
    assert.equal(classifyRegisterClientBlock("not-an-email", "longenough"), "email_invalid");
    assert.equal(classifyRegisterClientBlock("a@b.co", "short"), "password_short");
    assert.equal(classifyRegisterClientBlock("a@b.co", "longenough"), null);
    assert.equal(
      JSON.stringify(classifyRegisterClientBlock("person@example.com", "x")).includes("@"),
      false,
    );
  });
});

describe("register and landing funnel events", () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;
  const originalSession = globalThis.sessionStorage;
  const originalLocal = globalThis.localStorage;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.NODE_ENV = originalNodeEnv;
    Object.assign(globalThis, {
      window: originalWindow,
      sessionStorage: originalSession,
      localStorage: originalLocal,
    });
  });

  it("sends a short-password error to Meta, TikTok, and first-party without the form text", async () => {
    const { meta, tiktok, local } = installWindow(
      "?utm_source=test&utm_campaign=x&email=person@example.com",
    );
    process.env.NODE_ENV = "production";
    const calls: { url: string; init: RequestInit }[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init: init ?? {} });
      return new Response("", { status: 404 });
    }) as typeof fetch;

    trackRegisterSubmitAttempt();
    trackRegisterClientError("password_short");
    await Promise.resolve();

    const props = { utm_source: "test", utm_campaign: "x", error_type: "password_short" };
    assert.equal(calls.length, 2);
    assert.equal(calls[1]!.url, funnelEventsUrl());
    const body = JSON.parse(String(calls[1]!.init.body)) as {
      event: string;
      props: Record<string, unknown>;
    };
    assert.equal(body.event, "register_client_error");
    assert.deepEqual(body.props, props);
    assert.deepEqual(Object.keys(body.props).sort(), [
      "error_type",
      "utm_campaign",
      "utm_source",
    ]);
    assert.equal(JSON.stringify(body).includes("person@example.com"), false);
    assert.deepEqual(meta.at(-1), ["trackCustom", "register_client_error", props]);
    assert.deepEqual(tiktok.at(-1), ["register_client_error", props]);
    assert.deepEqual(registerAttributionEventProps(), {
      utm_source: "test",
      utm_campaign: "x",
    });
    assert.deepEqual(registerRequestAttribution(), {
      utm_source: "test",
      utm_campaign: "x",
    });
    const stored = JSON.parse(local.getItem(FIRST_TOUCH_STORAGE_KEY) ?? "{}") as Record<
      string,
      unknown
    >;
    assert.equal(stored.email, undefined);
  });

  it("sends landing_cta_click with only the button id", async () => {
    const { meta, tiktok } = installWindow("");
    process.env.NODE_ENV = "production";
    const calls: RequestInit[] = [];
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(init ?? {});
      return new Response("", { status: 204 });
    }) as typeof fetch;

    trackLandingCtaClick("hero_primary");
    await Promise.resolve();

    const body = JSON.parse(String(calls[0]!.body)) as {
      event: string;
      props: Record<string, unknown>;
    };
    assert.equal(body.event, "landing_cta_click");
    assert.deepEqual(body.props, { button: "hero_primary" });
    assert.deepEqual(meta[0], ["trackCustom", "landing_cta_click", { button: "hero_primary" }]);
    assert.deepEqual(tiktok[0], ["landing_cta_click", { button: "hero_primary" }]);
  });

  it("does not first-party post existing check-in events from the shared helper", async () => {
    installWindow("");
    let fetches = 0;
    globalThis.fetch = (async () => {
      fetches += 1;
      return new Response("", { status: 204 });
    }) as typeof fetch;

    trackFunnelEvent(FUNNEL_EVENTS.checkInSubmitAttempt, { skip_mode: true });
    await Promise.resolve();
    assert.equal(fetches, 0);
  });
});
