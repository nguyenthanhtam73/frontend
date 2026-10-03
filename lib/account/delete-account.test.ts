import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { ApiError } from "@/lib/api-client";
import { isOnboardingGateExemptPath } from "@/lib/onboarding/post-auth-destination";
import { SITEMAP_PUBLIC_PATHS, robotsDisallowPaths } from "@/lib/seo";
import {
  AUTH_REFRESH_STORAGE_KEY,
  AUTH_TOKEN_STORAGE_KEY,
  setAuthTokens,
} from "@/lib/auth-token";

import {
  GUEST_INDEXED_DB_NAMES,
  clearDeviceAfterAccountDeletion,
} from "./clear-device-after-delete";
import {
  DELETE_ACCOUNT_API_PATH,
  canConfirmDeleteAccount,
  classifyDeleteAccountError,
  requestDeleteAccount,
  submitAccountDeletion,
} from "./delete-account-flow";

const ROOT = process.cwd();

function readJson(rel: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8")) as Record<string, unknown>;
}

function futureAccessToken(): string {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60;
  const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  return `hdr.${payload}.sig`;
}

function installMemoryStorage(): void {
  const data = new Map<string, string>();
  const storage = {
    getItem: (key: string) => (data.has(key) ? data.get(key)! : null),
    setItem: (key: string, value: string) => {
      data.set(key, String(value));
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    clear: () => data.clear(),
    key: (index: number) => [...data.keys()][index] ?? null,
    get length() {
      return data.size;
    },
  };
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: storage,
      sessionStorage: storage,
      dispatchEvent: () => true,
    },
  });
}

installMemoryStorage();

type FetchCall = { url: string; method: string; headers: Headers; body: string };

function mockFetch(status: number, jsonBody?: unknown): FetchCall[] {
  const calls: FetchCall[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    const body = typeof init?.body === "string" ? init.body : "";
    calls.push({
      url: String(input),
      method: init?.method ?? "GET",
      headers,
      body,
    });
    if (jsonBody === undefined) {
      return new Response(null, { status });
    }
    return new Response(JSON.stringify(jsonBody), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;
  return calls;
}

describe("delete account page is public", () => {
  const pageSrc = fs.readFileSync(
    path.join(ROOT, "app/[locale]/(marketing)/delete-account/page.tsx"),
    "utf8",
  );

  it("renders from the marketing route with no auth redirect", () => {
    assert.match(pageSrc, /DeleteAccountDoc/);
    assert.match(pageSrc, /legal\.deleteAccount/);
    assert.match(pageSrc, /localePath\(locale, "\/privacy"\)/);
    assert.match(pageSrc, /localePath\(locale, "\/"\)/);
    assert.doesNotMatch(pageSrc, /useAuthStore|getAccessToken|redirect\(/);
    assert.equal(isOnboardingGateExemptPath("/delete-account"), true);
    assert.ok((SITEMAP_PUBLIC_PATHS as readonly string[]).includes("/delete-account"));
    assert.equal(
      robotsDisallowPaths().some((p) => p === "/delete-account" || p === "/en/delete-account"),
      false,
    );
  });

  it("is linked from the footer and the privacy page", () => {
    const footer = fs.readFileSync(
      path.join(ROOT, "components/site/site-footer-nav.tsx"),
      "utf8",
    );
    const privacy = fs.readFileSync(path.join(ROOT, "components/legal/legal-doc.tsx"), "utf8");
    assert.match(footer, /href: "\/delete-account"/);
    assert.match(privacy, /href="\/delete-account"/);
    const section = fs.readFileSync(
      path.join(ROOT, "components/privacy/delete-account-section.tsx"),
      "utf8",
    );
    assert.match(section, /submitAccountDeletion/);
    assert.match(section, /accountDeleted: "1"/);
    assert.match(section, /}, \[open\]\);/);
    assert.doesNotMatch(section, /\[open, busy\]/);
    assert.doesNotMatch(section, /s\.logout|clearPushSubscriptionOnLogout|\/auth\/logout/);
  });
});

describe("delete account copy", () => {
  it("uses the Vietnamese strings for success, wrong password, and too many tries", () => {
    const vi = readJson("messages/vi.json");
    const common = vi.common as { accountDeleted: string };
    const privacy = vi.privacy as {
      deleteAccountInvalidPassword: string;
      deleteAccountRateLimited: string;
    };
    const page = (vi.legal as { deleteAccount: { title: string } }).deleteAccount;
    assert.equal(common.accountDeleted, "Tài khoản đã được xoá.");
    assert.equal(privacy.deleteAccountInvalidPassword, "Mật khẩu chưa đúng.");
    assert.equal(privacy.deleteAccountRateLimited, "Bạn thử nhiều lần quá, đợi một lúc rồi thử lại.");
    assert.equal(page.title, "Xoá tài khoản DaDiary");

    const en = readJson("messages/en.json") as {
      legal: { deleteAccount: Record<string, unknown> };
      privacy: Record<string, unknown>;
      common: { accountDeleted: string; footer: { deleteAccount: string } };
    };
    const viPage = (vi.legal as { deleteAccount: Record<string, unknown> }).deleteAccount;
    assert.deepEqual(Object.keys(en.legal.deleteAccount), Object.keys(viPage));
    const viRetention = viPage.retention as { payments: string; stats: string };
    const enRetention = en.legal.deleteAccount.retention as { payments: string; stats: string };
    assert.deepEqual(Object.keys(enRetention), ["payments", "stats"]);
    assert.match(viRetention.payments, /10 năm/);
    assert.match(viRetention.stats, /lâu dài/);
    assert.match(enRetention.payments, /10 years/);
    assert.match(enRetention.stats, /long-term/);
    assert.deepEqual(Object.keys(en.legal.deleteAccount.steps as object), ["s1", "s2", "s3", "s4"]);
    assert.equal(typeof en.common.accountDeleted, "string");
    assert.equal(en.common.footer.deleteAccount, "Delete account");
    assert.equal(typeof en.privacy.deleteAccountInvalidPassword, "string");
    assert.equal(typeof en.privacy.deleteAccountRateLimited, "string");
  });
});

describe("submitAccountDeletion", () => {
  it("clears the device only after a successful delete", async () => {
    let cleared = false;
    const result = await submitAccountDeletion({
      password: "secret",
      request: async () => ({ ok: true }),
      clearDevice: async () => {
        cleared = true;
      },
    });
    assert.equal(result.ok, true);
    assert.equal(cleared, true);
  });

  it("does not clear the device on a wrong password", async () => {
    let cleared = false;
    const result = await submitAccountDeletion({
      password: "nope",
      request: async () => ({ ok: false, reason: "invalid_password" }),
      clearDevice: async () => {
        cleared = true;
      },
    });
    assert.deepEqual(result, { ok: false, reason: "invalid_password" });
    assert.equal(cleared, false);
  });

  it("does not clear the device when the server says to wait", async () => {
    let cleared = false;
    const result = await submitAccountDeletion({
      password: "secret",
      request: async () => ({ ok: false, reason: "rate_limited" }),
      clearDevice: async () => {
        cleared = true;
      },
    });
    assert.deepEqual(result, { ok: false, reason: "rate_limited" });
    assert.equal(cleared, false);
  });

  it("maps 401 invalid_password and 429 onto those reasons", () => {
    assert.equal(
      classifyDeleteAccountError(
        new ApiError("unauthorized", { status: 401, code: "invalid_password" }),
      ),
      "invalid_password",
    );
    assert.equal(
      classifyDeleteAccountError(new ApiError("rate_limited", { status: 429 })),
      "rate_limited",
    );
    assert.equal(classifyDeleteAccountError(new Error("nope")), "failed");
    assert.equal(canConfirmDeleteAccount(""), false);
    assert.equal(canConfirmDeleteAccount("a"), true);
  });
});

describe("DELETE /api/v1/me", () => {
  it("sends the password as JSON and clears the session on 204", async () => {
    const token = futureAccessToken();
    setAuthTokens(token, "refresh-token");
    localStorage.setItem("dadiary_guest_checkin_v1", "draft");
    const calls = mockFetch(204);
    const result = await submitAccountDeletion({
      password: "p@ss",
      request: requestDeleteAccount,
      clearDevice: async () => {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        localStorage.removeItem(AUTH_REFRESH_STORAGE_KEY);
        localStorage.removeItem("dadiary_guest_checkin_v1");
      },
    });
    assert.equal(result.ok, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.method, "DELETE");
    assert.match(calls[0]!.url, new RegExp(`${DELETE_ACCOUNT_API_PATH}$`));
    assert.equal(calls[0]!.headers.get("authorization"), `Bearer ${token}`);
    assert.deepEqual(JSON.parse(calls[0]!.body), { password: "p@ss" });
    assert.equal(
      calls.some((call) => /\/auth\/logout|push\/unsubscribe/.test(call.url)),
      false,
    );
    assert.equal(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY), null);
    assert.equal(localStorage.getItem("dadiary_guest_checkin_v1"), null);
  });

  it("keeps the session and does not refresh on invalid_password", async () => {
    const token = futureAccessToken();
    setAuthTokens(token, "refresh-token");
    const calls = mockFetch(401, { error: { code: "invalid_password" } });
    let cleared = false;
    const result = await submitAccountDeletion({
      password: "wrong",
      request: requestDeleteAccount,
      clearDevice: async () => {
        cleared = true;
      },
    });
    assert.deepEqual(result, { ok: false, reason: "invalid_password" });
    assert.equal(cleared, false);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.method, "DELETE");
    assert.equal(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY), token);
    assert.equal(localStorage.getItem(AUTH_REFRESH_STORAGE_KEY), "refresh-token");
  });

  it("reports 429 without clearing the session", async () => {
    const token = futureAccessToken();
    setAuthTokens(token);
    const calls = mockFetch(429, { error: { code: "rate_limited" } });
    let cleared = false;
    const result = await submitAccountDeletion({
      password: "secret",
      request: requestDeleteAccount,
      clearDevice: async () => {
        cleared = true;
      },
    });
    assert.deepEqual(result, { ok: false, reason: "rate_limited" });
    assert.equal(cleared, false);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.method, "DELETE");
  });
});

describe("clearDeviceAfterAccountDeletion", () => {
  it("drops guest drafts and tokens locally without calling logout or push unsubscribe", async () => {
    const sessionData = new Map<string, string>();
    const session = {
      getItem: (key: string) => (sessionData.has(key) ? sessionData.get(key)! : null),
      setItem: (key: string, value: string) => {
        sessionData.set(key, String(value));
      },
      removeItem: (key: string) => {
        sessionData.delete(key);
      },
      clear: () => sessionData.clear(),
      key: (index: number) => [...sessionData.keys()][index] ?? null,
      get length() {
        return sessionData.size;
      },
    };
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: session });
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        localStorage,
        sessionStorage: session,
        dispatchEvent: () => true,
      },
    });

    let cookieJar = "dadiary_guest_onboarding_trial=1; theme=dark";
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: {
        get cookie() {
          return cookieJar;
        },
        set cookie(value: string) {
          const pair = value.split(";")[0] ?? "";
          const name = pair.split("=")[0]?.trim() ?? "";
          const parts = cookieJar
            .split("; ")
            .filter((part) => part && !part.startsWith(`${name}=`));
          if (!/Max-Age=0/i.test(value)) parts.push(pair.trim());
          cookieJar = parts.join("; ");
        },
      },
    });

    const deletedDbs: string[] = [];
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value: {
        deleteDatabase(name: string) {
          deletedDbs.push(name);
          const request = {
            onsuccess: null as (() => void) | null,
            onerror: null as (() => void) | null,
            onblocked: null as (() => void) | null,
          };
          queueMicrotask(() => request.onsuccess?.());
          return request;
        },
      },
    });

    const fetches: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      fetches.push(String(input));
      return new Response(null, { status: 500 });
    }) as typeof fetch;

    setAuthTokens(futureAccessToken(), "refresh-token");
    localStorage.setItem("dadiary_guest_checkin_v1", "draft-with-notes");
    localStorage.setItem("dadiary_guest_routine_v1", "{\"starter\":true}");
    localStorage.setItem("dadiary_guest_extra", "future-key");
    localStorage.setItem("hasCompletedOnboardingTrial", "true");
    localStorage.setItem("keep-unrelated", "stay");
    session.setItem("dadiary_guest_session", "temp");
    session.setItem("dadiary_onboarding_exit_anim", "1");
    session.setItem("keep-session", "stay");

    await clearDeviceAfterAccountDeletion();

    assert.equal(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY), null);
    assert.equal(localStorage.getItem(AUTH_REFRESH_STORAGE_KEY), null);
    assert.equal(localStorage.getItem("dadiary_guest_checkin_v1"), null);
    assert.equal(localStorage.getItem("dadiary_guest_routine_v1"), null);
    assert.equal(localStorage.getItem("dadiary_guest_extra"), null);
    assert.equal(localStorage.getItem("hasCompletedOnboardingTrial"), null);
    assert.equal(localStorage.getItem("keep-unrelated"), "stay");
    assert.equal(session.getItem("dadiary_guest_session"), null);
    assert.equal(session.getItem("dadiary_onboarding_exit_anim"), null);
    assert.equal(session.getItem("keep-session"), "stay");
    assert.equal(cookieJar.includes("dadiary_guest_onboarding_trial"), false);
    assert.equal(cookieJar.includes("theme=dark"), true);
    assert.deepEqual([...deletedDbs].sort(), [...GUEST_INDEXED_DB_NAMES].sort());
    assert.deepEqual(fetches, []);
  });
});
