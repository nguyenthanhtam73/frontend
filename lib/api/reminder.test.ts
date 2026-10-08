import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  commitDailyReminderTime,
  consumePushOptInReshow,
  fetchPushOptInReminder,
  skipPushOptIn,
  updateReminderSchedule,
} from "./reminder";

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

function installSession() {
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
}

describe("reminder schedule API", { concurrency: false }, () => {
  afterEach(() => {
    restoreGlobals();
  });

  it("does not call the API for a guest", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    assert.equal(await fetchPushOptInReminder(), null);
    assert.equal(await skipPushOptIn(), null);
    assert.equal(await consumePushOptInReshow(), null);
    assert.equal(
      await updateReminderSchedule({ enabled: true, time: "20:00", timezone: "Asia/Ho_Chi_Minh" }),
      null,
    );
    assert.equal(
      await commitDailyReminderTime({
        time: "20:00",
        timezone: "Asia/Ho_Chi_Minh",
        previous: null,
      }),
      null,
    );
    assert.equal(calls, 0);
  });

  it("keeps push opt-in actions free of schedule fields", async () => {
    installSession();
    const calls: { url: string; init: RequestInit }[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init: init ?? {} });
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            push_opt_in_reshow_eligible: false,
            push_opt_in_show_after_check_in_only: true,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const skipped = await skipPushOptIn();
    const consumed = await consumePushOptInReshow();
    assert.equal(skipped?.push_opt_in_show_after_check_in_only, true);
    assert.equal(consumed?.schedule, undefined);
    assert.equal(calls.length, 2);
    assert.equal(calls[0]!.init.method, "PUT");
    assert.equal(
      calls[0]!.init.body,
      JSON.stringify({ push_opt_in_action: "skip_push_opt_in" }),
    );
    assert.equal(
      calls[1]!.init.body,
      JSON.stringify({ push_opt_in_action: "consume_push_opt_in_reshow" }),
    );
    for (const call of calls) {
      assert.match(call.url, /\/api\/v1\/me\/reminder$/);
      assert.equal(call.init.body?.toString().includes("time"), false);
      assert.equal(call.init.body?.toString().includes("timezone"), false);
      assert.equal(call.init.body?.toString().includes("enabled"), false);
    }
  });

  it("PUTs a first saved time and leaves unchanged fields off a later edit", async () => {
    installSession();
    const calls: RequestInit[] = [];
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      calls.push(init ?? {});
      const body = JSON.parse(String(init?.body ?? "{}")) as { time?: string };
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            push_opt_in_reshow_eligible: false,
            push_opt_in_show_after_check_in_only: true,
            schedule: {
              enabled: true,
              time: body.time ?? "20:00",
              timezone: "Asia/Ho_Chi_Minh",
            },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const first = await commitDailyReminderTime({
      time: "20:00",
      timezone: "Asia/Ho_Chi_Minh",
      previous: null,
    });
    assert.equal(first?.schedule?.time, "20:00");
    assert.equal(calls[0]!.method, "PUT");
    assert.deepEqual(JSON.parse(String(calls[0]!.body)), {
      enabled: true,
      time: "20:00",
      timezone: "Asia/Ho_Chi_Minh",
    });

    const edited = await commitDailyReminderTime({
      time: "21:15",
      timezone: "Asia/Ho_Chi_Minh",
      previous: { enabled: true, time: "20:00", timezone: "Asia/Ho_Chi_Minh" },
    });
    assert.equal(edited?.schedule?.enabled, true);
    assert.deepEqual(JSON.parse(String(calls[1]!.body)), { time: "21:15" });
    assert.equal(String(calls[1]!.body).includes("push_opt_in_action"), false);
  });

  it("does not PUT a blank or invalid time", async () => {
    installSession();
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      return new Response("{}", { status: 200 });
    }) as typeof fetch;

    assert.equal(await updateReminderSchedule({ time: "" }), null);
    assert.equal(await updateReminderSchedule({ time: "24:00", enabled: true }), null);
    assert.equal(
      await commitDailyReminderTime({ time: "", timezone: "Asia/Ho_Chi_Minh", previous: null }),
      null,
    );
    assert.equal(calls, 0);
  });

  it("reads an optional schedule from GET without requiring it", async () => {
    installSession();
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            push_opt_in_reshow_eligible: false,
            push_opt_in_show_after_check_in_only: true,
            schedule: { enabled: false, time: "19:30", timezone: "Asia/Ho_Chi_Minh" },
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const view = await fetchPushOptInReminder();
    assert.equal(view?.push_opt_in_reshow_eligible, false);
    assert.deepEqual(view?.schedule, {
      enabled: false,
      time: "19:30",
      timezone: "Asia/Ho_Chi_Minh",
    });
  });
});
