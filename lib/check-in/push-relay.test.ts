import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, it } from "node:test";

import { recordPushClick } from "../api/push";
import {
  consumePushOptInReshow,
  fetchPushOptInReminder,
  skipPushOptIn,
} from "../api/reminder";
import { canOfferActivationPush } from "./first-check-in-push";
import { shouldReshowPushAfterCheckIn } from "./push-opt-in-reshow";
import { buildPushClickRecord, readPushClickMessage } from "../push/click-record";

const originalFetch = globalThis.fetch;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");

function restoreGlobals() {
  globalThis.fetch = originalFetch;
  if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
  else delete (globalThis as { window?: unknown }).window;
  if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
  else delete (globalThis as { localStorage?: unknown }).localStorage;
}

describe("buildPushClickRecord", () => {
  it("uses the tag and notification timestamp in the idempotency key", () => {
    assert.deepEqual(
      buildPushClickRecord({
        type: "daily_reminder",
        tag: "daily-1",
        timestamp: 1_700_000_000_000,
        clickedAt: "2026-10-06T02:00:00.000Z",
      }),
      {
        kind: "daily_reminder",
        tag: "daily-1",
        idempotency_key: "daily-1-1700000000000",
        clicked_at: "2026-10-06T02:00:00.000Z",
      },
    );
  });

  it("falls back to the push type, then push, when the tag is empty", () => {
    assert.equal(
      buildPushClickRecord({
        type: "streak_at_risk",
        tag: "",
        timestamp: 5,
        clickedAt: "t",
      }).idempotency_key,
      "streak_at_risk-5",
    );
    assert.equal(
      buildPushClickRecord({
        type: "",
        tag: "",
        timestamp: 0,
        now: 42,
        clickedAt: "t",
      }).idempotency_key,
      "push-42",
    );
    assert.equal(
      buildPushClickRecord({
        type: "d0_reminder",
        now: 99,
        clickedAt: "t",
      }).idempotency_key,
      "d0_reminder-99",
    );
  });

  it("matches the service worker idempotency formula", () => {
    const sw = readFileSync(path.join(process.cwd(), "public/sw.js"), "utf8");
    assert.match(sw, /idempotency_key: `\$\{tag \|\| kind \|\| "push"\}-\$\{timestamp\}`/);
    assert.match(sw, /type: "DADIARY_PUSH_CLICK"/);
    assert.equal(
      readPushClickMessage({
        type: "DADIARY_PUSH_CLICK",
        click: buildPushClickRecord({
          type: "test",
          tag: "t1",
          timestamp: 8,
          clickedAt: "2026-10-06T00:00:00.000Z",
        }),
      })?.idempotency_key,
      "t1-8",
    );
    assert.equal(readPushClickMessage({ type: "DADIARY_PUSH_NAVIGATE" }), null);
  });
});

describe("shouldReshowPushAfterCheckIn", () => {
  const open: Parameters<typeof shouldReshowPushAfterCheckIn>[0] = {
    pushOptInReshowEligible: true,
    supportOk: true,
    permission: "default",
    hasBrowserSubscription: false,
    localPushEnabled: false,
    firstCheckInNudgeVisible: false,
  };

  it("shows when the server allows a re-show and push is still off", () => {
    assert.equal(shouldReshowPushAfterCheckIn(open), true);
    assert.equal(
      shouldReshowPushAfterCheckIn({ ...open, permission: "granted" }),
      true,
    );
  });

  it("bypasses a local dismiss that would hide the first-check-in nudge", () => {
    assert.equal(
      canOfferActivationPush({
        supportOk: true,
        permission: "default",
        localPushEnabled: false,
        nudgeStatus: "dismissed",
      }),
      false,
    );
    assert.equal(shouldReshowPushAfterCheckIn(open), true);
  });

  it("hides when ineligible, unsupported, denied, subscribed, or the first nudge is up", () => {
    assert.equal(
      shouldReshowPushAfterCheckIn({ ...open, pushOptInReshowEligible: false }),
      false,
    );
    assert.equal(shouldReshowPushAfterCheckIn({ ...open, supportOk: false }), false);
    assert.equal(
      shouldReshowPushAfterCheckIn({ ...open, permission: "denied" }),
      false,
    );
    assert.equal(
      shouldReshowPushAfterCheckIn({ ...open, hasBrowserSubscription: true }),
      false,
    );
    assert.equal(
      shouldReshowPushAfterCheckIn({ ...open, localPushEnabled: true }),
      false,
    );
    assert.equal(
      shouldReshowPushAfterCheckIn({ ...open, firstCheckInNudgeVisible: true }),
      false,
    );
  });
});

describe("push reminder and click helpers without an access token", { concurrency: false }, () => {
  afterEach(() => {
    restoreGlobals();
  });

  it("does not call the API for a guest", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    const click = buildPushClickRecord({
      type: "daily_reminder",
      tag: "daily",
      timestamp: 1,
      clickedAt: "2026-10-06T02:00:00.000Z",
    });
    assert.equal(await recordPushClick(click), null);
    assert.equal(await fetchPushOptInReminder(), null);
    assert.equal(await skipPushOptIn(), null);
    assert.equal(await consumePushOptInReshow(), null);
    assert.equal(calls, 0);
  });

  it("posts the click and the skip action when a token is present", async () => {
    const store = new Map<string, string>([["dadiary_access_token", "x.e30.y"]]);
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    };
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { localStorage: storage, dispatchEvent() {} },
    });
    if (typeof navigator !== "undefined") {
      Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    }

    const calls: { url: string; init: RequestInit }[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init: init ?? {} });
      const url = String(input);
      const data = url.includes("/push/click")
        ? { recorded: true, duplicate: false }
        : {
            push_opt_in_reshow_eligible: false,
            push_opt_in_show_after_check_in_only: true,
          };
      return new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    const click = buildPushClickRecord({
      type: "d1_reminder",
      tag: "d1",
      timestamp: 12,
      clickedAt: "2026-10-06T02:00:00.000Z",
    });
    const recorded = await recordPushClick(click);
    const skipped = await skipPushOptIn();

    assert.deepEqual(recorded, { recorded: true, duplicate: false });
    assert.equal(skipped?.push_opt_in_show_after_check_in_only, true);
    assert.equal(calls.length, 2);
    assert.match(calls[0]!.url, /\/api\/v1\/me\/push\/click$/);
    assert.equal(calls[0]!.init.method, "POST");
    assert.equal(calls[0]!.init.body, JSON.stringify(click));
    const auth = new Headers(calls[0]!.init.headers).get("authorization");
    assert.equal(auth, "Bearer x.e30.y");
    assert.match(calls[1]!.url, /\/api\/v1\/me\/reminder$/);
    assert.equal(calls[1]!.init.method, "PUT");
    assert.equal(
      calls[1]!.init.body,
      JSON.stringify({ push_opt_in_action: "skip_push_opt_in" }),
    );
  });
});
