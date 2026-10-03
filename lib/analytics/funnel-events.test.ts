import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { apiBaseUrl } from "@/lib/api";
import { AUTH_TOKEN_STORAGE_KEY } from "@/lib/auth-token";

import { ATTRIBUTION_MAX_LEN, FIRST_TOUCH_STORAGE_KEY } from "./attribution";
import {
  FIRST_PARTY_FUNNEL_EVENTS,
  buildFunnelEventBody,
  funnelEventsUrl,
  getFunnelSessionId,
  sendFunnelEvent,
} from "./funnel-events";

type MemStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function memoryStore(initial?: Record<string, string>): MemStore {
  const map = new Map(Object.entries(initial ?? {}));
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

function installWindow(opts?: {
  session?: MemStore;
  local?: MemStore;
  pathname?: string;
}) {
  const session = opts?.session ?? memoryStore();
  const local = opts?.local ?? memoryStore();
  const win = {
    location: { pathname: opts?.pathname ?? "/check-in" },
    sessionStorage: session,
    localStorage: local,
  };
  Object.assign(globalThis, {
    window: win,
    sessionStorage: session,
    localStorage: local,
  });
  return { session, local };
}

describe("funnel event sender", () => {
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

  it("builds the ingest payload and reuses the session id", () => {
    installWindow({ pathname: "/check-in" });
    const first = buildFunnelEventBody("checkin_page_view", {
      never_checked_in: true,
      skip_mode: false,
      signed_in: true,
    });
    const second = buildFunnelEventBody(FIRST_PARTY_FUNNEL_EVENTS.checkInFormView, {
      never_checked_in: true,
    });

    assert.equal(first.event, "checkin_page_view");
    assert.equal(first.path, "/check-in");
    assert.deepEqual(first.props, {
      never_checked_in: true,
      skip_mode: false,
      signed_in: true,
    });
    assert.match(first.client_ts, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(second.session_id, first.session_id);
    assert.equal(getFunnelSessionId(), first.session_id);
    assert.equal(funnelEventsUrl(), `${apiBaseUrl.replace(/\/$/, "")}/api/v1/funnel-events`);
  });

  it("POSTs keepalive JSON and attaches the bearer token when logged in", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    installWindow({
      local: memoryStore({ [AUTH_TOKEN_STORAGE_KEY]: "access-token-1" }),
      pathname: "/check-in",
    });
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init: init ?? {} });
      return new Response(JSON.stringify({ success: true }), { status: 201 });
    }) as typeof fetch;

    sendFunnelEvent(FIRST_PARTY_FUNNEL_EVENTS.checkInSubmitClicked, {
      never_checked_in: true,
      skip_mode: false,
      signed_in: true,
      photo_count: 0,
    });

    await Promise.resolve();
    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.url, funnelEventsUrl());
    assert.equal(calls[0]!.init.method, "POST");
    assert.equal(calls[0]!.init.keepalive, true);
    const headers = calls[0]!.init.headers as Record<string, string>;
    assert.equal(headers.Authorization, "Bearer access-token-1");
    assert.equal(headers["Content-Type"], "application/json");
    const body = JSON.parse(String(calls[0]!.init.body)) as {
      event: string;
      session_id: string;
      path: string;
      props: Record<string, unknown>;
      client_ts: string;
    };
    assert.equal(body.event, "checkin_submit_clicked");
    assert.equal(body.path, "/check-in");
    assert.equal(typeof body.session_id, "string");
    assert.ok(body.session_id.length > 0);
    assert.match(body.client_ts, /^\d{4}-\d{2}-\d{2}T/);
    assert.deepEqual(body.props, {
      never_checked_in: true,
      skip_mode: false,
      signed_in: true,
      photo_count: 0,
    });
  });

  it("omits Authorization when there is no access token", async () => {
    const calls: RequestInit[] = [];
    installWindow();
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(init ?? {});
      return new Response("", { status: 204 });
    }) as typeof fetch;

    sendFunnelEvent("checkin_form_view", { signed_in: false });
    await Promise.resolve();
    const headers = calls[0]!.headers as Record<string, string>;
    assert.equal(headers.Authorization, undefined);
  });

  it("does not throw when the endpoint 404s", async () => {
    installWindow();
    globalThis.fetch = (async () => new Response("missing", { status: 404 })) as typeof fetch;
    assert.doesNotThrow(() => {
      sendFunnelEvent(FIRST_PARTY_FUNNEL_EVENTS.checkInSubmitError, {
        status: 404,
        reason: "not_found",
      });
    });
    await Promise.resolve();
  });

  it("does not throw when fetch rejects", async () => {
    installWindow();
    globalThis.fetch = (async () => {
      throw new Error("offline");
    }) as typeof fetch;
    assert.doesNotThrow(() => {
      sendFunnelEvent("checkin_page_view", { signed_in: false });
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  it("does not throw when sessionStorage is blocked", async () => {
    const broken: MemStore = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
      removeItem() {
        throw new Error("blocked");
      },
    };
    installWindow({ session: broken });
    let body = "";
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      body = String(init?.body ?? "");
      return new Response("", { status: 204 });
    }) as typeof fetch;

    assert.doesNotThrow(() => sendFunnelEvent("checkin_photo_staged", { slot: 0 }));
    await Promise.resolve();
    const parsed = JSON.parse(body) as { session_id: string };
    assert.equal(parsed.session_id, "ephemeral");
  });

  it("drops keys the register and landing DTOs reject", async () => {
    const { local } = installWindow({ pathname: "/register" });
    local.setItem(
      FIRST_TOUCH_STORAGE_KEY,
      JSON.stringify({
        utm_source: "meta",
        utm_medium: "paid",
        utm_campaign: "spring",
        utm_content: "video_tu_do",
        fbclid: "IwAR",
        ttclid: "tt.1",
      }),
    );
    const bodies: { event: string; props: Record<string, unknown> }[] = [];
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      const parsed = JSON.parse(String(init?.body ?? "{}")) as {
        event: string;
        props: Record<string, unknown>;
      };
      bodies.push(parsed);
      return new Response("", { status: 204 });
    }) as typeof fetch;

    const smuggled = {
      utm_medium: "paid",
      ttclid: "tt.1",
      gclid: "Cjw",
      email: "person@example.com",
      password: "secret",
      error_type: "network",
      button: "hero_primary",
    };
    sendFunnelEvent("register_form_view", smuggled);
    sendFunnelEvent("register_submit_attempt", smuggled);
    sendFunnelEvent("register_email_exists", smuggled);
    sendFunnelEvent("register_client_error", smuggled);
    sendFunnelEvent("landing_cta_click", smuggled);
    await Promise.resolve();

    const attr = ["fbclid", "utm_campaign", "utm_content", "utm_source"];
    const keys = Object.fromEntries(bodies.map((body) => [body.event, Object.keys(body.props).sort()]));
    assert.deepEqual(keys.register_form_view, attr);
    assert.deepEqual(keys.register_submit_attempt, attr);
    assert.deepEqual(keys.register_email_exists, attr);
    assert.deepEqual(keys.register_client_error, ["error_type", ...attr]);
    assert.deepEqual(keys.landing_cta_click, ["button", ...attr]);
    assert.equal(keys.register_form_view.includes("error_type"), false);
    assert.equal(keys.register_client_error.includes("button"), false);
    assert.equal(keys.landing_cta_click.includes("error_type"), false);
    for (const body of bodies) {
      assert.equal(JSON.stringify(body.props).includes("person@example.com"), false);
      assert.equal(JSON.stringify(body.props).includes("secret"), false);
      assert.equal(body.props.utm_medium, undefined);
      assert.equal(body.props.ttclid, undefined);
      assert.equal(body.props.gclid, undefined);
    }
  });

  it("adds utm_content and fbclid to check-in posts and drops other attribution", async () => {
    const { local } = installWindow({ pathname: "/check-in" });
    const fbclid = "f".repeat(ATTRIBUTION_MAX_LEN + 30);
    local.setItem(
      FIRST_TOUCH_STORAGE_KEY,
      JSON.stringify({
        utm_source: "facebook",
        utm_medium: "paid",
        utm_campaign: "chiến dịch da",
        utm_content: "video_tu_do",
        fbclid,
        ttclid: "tt",
        email: "person@example.com",
        password: "secret",
      }),
    );
    let body = "";
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      body = String(init?.body ?? "");
      return new Response("", { status: 204 });
    }) as typeof fetch;

    sendFunnelEvent(FIRST_PARTY_FUNNEL_EVENTS.checkInSubmitClicked, {
      never_checked_in: true,
      skip_mode: false,
      signed_in: true,
      photo_count: 0,
    });
    await Promise.resolve();

    const parsed = JSON.parse(body) as { props: Record<string, unknown> };
    assert.deepEqual(parsed.props, {
      utm_source: "facebook",
      utm_campaign: "chiến dịch da",
      utm_content: "video_tu_do",
      fbclid: "f".repeat(ATTRIBUTION_MAX_LEN),
      never_checked_in: true,
      skip_mode: false,
      signed_in: true,
      photo_count: 0,
    });
    assert.equal(parsed.props.fbclid?.toString().length, ATTRIBUTION_MAX_LEN);
    assert.equal(body.includes("person@example.com"), false);
    assert.equal(body.includes("secret"), false);
    assert.equal(body.includes("ttclid"), false);
    assert.equal(parsed.props.utm_medium, undefined);
  });
});
