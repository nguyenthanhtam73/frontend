import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { ATTRIBUTION_MAX_LEN, FIRST_TOUCH_STORAGE_KEY, capturePageAttribution } from "./attribution";
import { FUNNEL_EVENTS, trackFunnelEvent } from "./funnel";
import { funnelEventsUrl } from "./funnel-events";
import {
  classifyRegisterClientBlock,
  registerAttributionEventProps,
  registerRequestAttribution,
  trackLandingCtaClick,
  trackRegisterClientError,
  trackRegisterEmailExistsForResponse,
  trackRegisterFormView,
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
      "?utm_source=test&utm_campaign=x&utm_content=video_tu_do&fbclid=IwAR123&email=person@example.com",
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

    const props = {
      utm_source: "test",
      utm_campaign: "x",
      utm_content: "video_tu_do",
      fbclid: "IwAR123",
      error_type: "password_short",
    };
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
      "fbclid",
      "utm_campaign",
      "utm_content",
      "utm_source",
    ]);
    assert.equal(JSON.stringify(body).includes("person@example.com"), false);
    assert.deepEqual(meta.at(-1), ["trackCustom", "register_client_error", props]);
    assert.deepEqual(tiktok.at(-1), ["register_client_error", props]);
    assert.deepEqual(registerAttributionEventProps(), {
      utm_source: "test",
      utm_campaign: "x",
      utm_content: "video_tu_do",
      fbclid: "IwAR123",
    });
    assert.deepEqual(registerRequestAttribution(), {
      utm_source: "test",
      utm_campaign: "x",
      utm_content: "video_tu_do",
      fbclid: "IwAR123",
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

  it("fires register_email_exists for an email 409 and not for a username 409", async () => {
    installWindow(
      "?utm_source=test&utm_campaign=x&utm_content=video_tu_do&fbclid=IwAR123&email=person@example.com",
    );
    process.env.NODE_ENV = "production";
    const calls: RequestInit[] = [];
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(init ?? {});
      return new Response("", { status: 204 });
    }) as typeof fetch;

    trackRegisterEmailExistsForResponse(409, {
      success: false,
      error: { code: "email_taken", message: "email already registered" },
    });
    trackRegisterEmailExistsForResponse(409, {
      error: { code: "username_taken", message: "username already taken" },
    });
    await Promise.resolve();

    assert.equal(calls.length, 1);
    const body = JSON.parse(String(calls[0]!.body)) as {
      event: string;
      props: Record<string, unknown>;
    };
    assert.equal(body.event, "register_email_exists");
    assert.equal(body.props.error_type, undefined);
    assert.deepEqual(body.props, {
      utm_source: "test",
      utm_campaign: "x",
      utm_content: "video_tu_do",
      fbclid: "IwAR123",
    });
    assert.equal(JSON.stringify(body).includes("person@example.com"), false);
    assert.equal(JSON.stringify(body).includes("email already registered"), false);
    assert.equal(JSON.stringify(body).includes("username"), false);
  });

  it("sends the four first-touch keys on landing clicks and drops everything else", async () => {
    const campaign = "chiến dịch da";
    const fbclid = "f".repeat(ATTRIBUTION_MAX_LEN + 20);
    const { meta, tiktok } = installWindow(
      `?utm_source=facebook&utm_medium=paid&utm_campaign=${encodeURIComponent(campaign)}&utm_content=video_tu_do&fbclid=${fbclid}&ttclid=tt&email=person@example.com&password=secret`,
    );
    process.env.NODE_ENV = "production";
    const calls: RequestInit[] = [];
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(init ?? {});
      return new Response("", { status: 204 });
    }) as typeof fetch;

    trackRegisterFormView();
    trackLandingCtaClick("header_register");
    await Promise.resolve();

    const attr = {
      utm_source: "facebook",
      utm_campaign: campaign,
      utm_content: "video_tu_do",
      fbclid: "f".repeat(ATTRIBUTION_MAX_LEN),
    };
    const view = JSON.parse(String(calls[0]!.body)) as {
      event: string;
      props: Record<string, unknown>;
    };
    const click = JSON.parse(String(calls[1]!.body)) as {
      event: string;
      props: Record<string, unknown>;
    };
    assert.equal(view.event, "register_form_view");
    assert.deepEqual(view.props, attr);
    assert.equal(click.event, "landing_cta_click");
    assert.deepEqual(click.props, { ...attr, button: "header_register" });
    assert.equal(JSON.stringify(calls).includes("person@example.com"), false);
    assert.equal(JSON.stringify(calls).includes("secret"), false);
    assert.equal(JSON.stringify(calls).includes("ttclid"), false);
    assert.equal(click.props.utm_medium, undefined);
    assert.deepEqual(meta[0], ["trackCustom", "register_form_view", attr]);
    assert.deepEqual(tiktok[0], ["register_form_view", attr]);
    assert.deepEqual(meta.at(-1), [
      "trackCustom",
      "landing_cta_click",
      { ...attr, button: "header_register" },
    ]);
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

  it("adds the four first-touch props on check-in events without replacing check-in keys", async () => {
    const campaign = "chiến dịch da";
    const { meta, win } = installWindow(
      `?utm_source=facebook&utm_medium=paid&utm_campaign=${encodeURIComponent(campaign)}&utm_content=video_tu_do&fbclid=${"f".repeat(ATTRIBUTION_MAX_LEN + 8)}&ttclid=tt&email=person@example.com&password=secret`,
    );
    process.env.NODE_ENV = "production";
    capturePageAttribution();
    let fetches = 0;
    globalThis.fetch = (async () => {
      fetches += 1;
      return new Response("", { status: 204 });
    }) as typeof fetch;

    const checkInProps = { skip_mode: true, signed_in: false, photo_count: 1 };
    trackFunnelEvent(FUNNEL_EVENTS.checkInSubmitAttempt, checkInProps);
    trackFunnelEvent(FUNNEL_EVENTS.paywallView, { surface: "pricing", feature: "generic" });
    await Promise.resolve();

    const attr = {
      utm_source: "facebook",
      utm_campaign: campaign,
      utm_content: "video_tu_do",
      fbclid: "f".repeat(ATTRIBUTION_MAX_LEN),
    };
    assert.equal(fetches, 0);
    assert.deepEqual(meta[0], ["trackCustom", "checkin_submit_attempt", { ...attr, ...checkInProps }]);
    assert.deepEqual(meta[1], [
      "trackCustom",
      "paywall_view",
      { surface: "pricing", feature: "generic" },
    ]);
    const recorded = (
      win as { __dadiaryFunnel?: { name: string; params?: Record<string, unknown> }[] }
    ).__dadiaryFunnel;
    assert.equal(recorded?.[0]?.params?.fbclid, attr.fbclid);
    assert.equal(recorded?.[0]?.params?.skip_mode, true);
    assert.equal(recorded?.[0]?.params?.utm_medium, undefined);
    assert.equal(JSON.stringify(recorded?.[0]?.params).includes("person@example.com"), false);
    assert.equal(recorded?.[1]?.params?.utm_content, undefined);
    assert.equal(recorded?.[1]?.params?.fbclid, undefined);
  });
});
