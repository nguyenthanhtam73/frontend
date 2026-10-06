import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { PushNudgeCard } from "@/components/check-in/first-check-in-push-nudge";
import {
  commitDailyReminderTime,
  consumePushOptInReshow,
  skipPushOptIn,
} from "@/lib/api/reminder";
import vi from "../../messages/vi.json";

import { DailyReminderScheduleCard } from "./daily-reminder-schedule-card";

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

function renderCard(node: ReactNode) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="vi" messages={vi} timeZone="Asia/Ho_Chi_Minh">
      {node}
    </NextIntlClientProvider>,
  );
}

describe("DailyReminderScheduleCard", () => {
  it("shows the daily clock for a signed-in user and hides it when reminders are off", () => {
    const fresh = renderCard(<DailyReminderScheduleCard placement="check-in" prefetch={null} />);
    assert.match(fresh, /Nhắc mình chụp da mỗi ngày/);
    assert.match(fresh, /Mỗi ngày tối đa một lần nhắc/);
    assert.match(fresh, /Hôm nào đã chụp rồi thì không nhắc nữa/);
    assert.match(fresh, /data-testid="daily-reminder-time"/);
    assert.match(fresh, /value="20:00"/);
    assert.match(fresh, /data-testid="daily-reminder-save"/);
    assert.match(fresh, /Lưu giờ này/);
    assert.match(fresh, /min-h-11 w-full/);
    assert.match(fresh, /data-placement="check-in"/);

    const off = renderCard(
      <DailyReminderScheduleCard
        placement="settings"
        prefetch={{
          push_opt_in_reshow_eligible: false,
          push_opt_in_show_after_check_in_only: true,
          schedule: { enabled: false, time: "20:00", timezone: "Asia/Ho_Chi_Minh" },
        }}
      />,
    );
    assert.match(off, /Tắt nhắc/);
    assert.equal(off.includes('data-testid="daily-reminder-time"'), false);
    assert.equal(off.includes('data-testid="daily-reminder-save"'), false);
  });

  it("keeps the push opt-in card and still mounts it beside the new schedule card", () => {
    const html = renderCard(
      <PushNudgeCard
        testId="post-checkin-push-reshow"
        enabling={false}
        error={null}
        onEnable={() => {}}
        onDismiss={() => {}}
      />,
    );
    assert.match(html, /data-testid="post-checkin-push-reshow"/);
    assert.match(html, /Bật thông báo/);
    assert.match(html, /Để sau/);

    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
    const form = readFileSync(path.join(root, "components/check-in/check-in-form.tsx"), "utf8");
    const card = readFileSync(
      path.join(root, "components/reminder/daily-reminder-schedule-card.tsx"),
      "utf8",
    );
    const completed = form.slice(form.indexOf('feedback.phase === "completed"'));
    assert.match(completed, /DailyReminderScheduleCard/);
    assert.match(completed, /signedIn \? <DailyReminderScheduleCard/);
    assert.match(completed, /<CheckInPushOffers/);
    assert.match(card, /commitDailyReminderTime\(/);
    assert.match(card, /data-testid="daily-reminder-save"/);
  });
});

describe("DailyReminderScheduleCard save", { concurrency: false }, () => {
  afterEach(() => {
    restoreGlobals();
  });

  it("keeps skip and consume on the push opt-in action, and saving a time PUTs the clock", async () => {
    installSession();
    const calls: { url: string; init: RequestInit }[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init: init ?? {} });
      const body = JSON.parse(String(init?.body ?? "{}")) as {
        push_opt_in_action?: string;
        time?: string;
      };
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            push_opt_in_reshow_eligible: body.push_opt_in_action !== "skip_push_opt_in",
            push_opt_in_show_after_check_in_only: true,
            schedule: body.time
              ? { enabled: true, time: body.time, timezone: "Asia/Ho_Chi_Minh" }
              : undefined,
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const skipped = await skipPushOptIn();
    assert.equal(skipped?.push_opt_in_reshow_eligible, false);
    assert.equal(
      calls[0]!.init.body,
      JSON.stringify({ push_opt_in_action: "skip_push_opt_in" }),
    );

    await consumePushOptInReshow();
    assert.equal(
      calls[1]!.init.body,
      JSON.stringify({ push_opt_in_action: "consume_push_opt_in_reshow" }),
    );

    const saved = await commitDailyReminderTime({
      time: "20:00",
      timezone: "Asia/Ho_Chi_Minh",
      previous: null,
    });
    assert.equal(saved?.schedule?.time, "20:00");
    assert.equal(calls.length, 3);
    for (const call of calls) {
      assert.match(call.url, /\/api\/v1\/me\/reminder$/);
      assert.equal(call.init.method, "PUT");
    }
    assert.deepEqual(JSON.parse(String(calls[2]!.init.body)), {
      enabled: true,
      time: "20:00",
      timezone: "Asia/Ho_Chi_Minh",
    });
    assert.equal(String(calls[2]!.init.body).includes("push_opt_in_action"), false);
  });
});
