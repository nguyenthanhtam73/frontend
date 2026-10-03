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
    assert.match(section, /useAuthStore\(\(s\) => s\.logout\)/);
    assert.match(section, /submitAccountDeletion/);
    assert.match(section, /clearLocalUserData/);
    assert.match(section, /accountDeleted: "1"/);
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
    assert.deepEqual(Object.keys(en.legal.deleteAccount.steps as object), ["s1", "s2", "s3", "s4"]);
    assert.equal(typeof en.common.accountDeleted, "string");
    assert.equal(en.common.footer.deleteAccount, "Delete account");
    assert.equal(typeof en.privacy.deleteAccountInvalidPassword, "string");
    assert.equal(typeof en.privacy.deleteAccountRateLimited, "string");
  });
});

describe("submitAccountDeletion", () => {
  it("clears the session only after a successful delete", async () => {
    const order: string[] = [];
    const result = await submitAccountDeletion({
      password: "secret",
      request: async () => ({ ok: true }),
      logout: async () => {
        order.push("logout");
      },
      clearClientState: () => {
        order.push("clear");
      },
    });
    assert.equal(result.ok, true);
    assert.deepEqual(order, ["logout", "clear"]);
  });

  it("does not clear the session on a wrong password", async () => {
    let loggedOut = false;
    const result = await submitAccountDeletion({
      password: "nope",
      request: async () => ({ ok: false, reason: "invalid_password" }),
      logout: async () => {
        loggedOut = true;
      },
    });
    assert.deepEqual(result, { ok: false, reason: "invalid_password" });
    assert.equal(loggedOut, false);
  });

  it("does not clear the session when the server says to wait", async () => {
    let loggedOut = false;
    const result = await submitAccountDeletion({
      password: "secret",
      request: async () => ({ ok: false, reason: "rate_limited" }),
      logout: async () => {
        loggedOut = true;
      },
    });
    assert.deepEqual(result, { ok: false, reason: "rate_limited" });
    assert.equal(loggedOut, false);
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
    const calls = mockFetch(204);
    let loggedOut = false;
    const result = await submitAccountDeletion({
      password: "p@ss",
      request: requestDeleteAccount,
      logout: async () => {
        loggedOut = true;
      },
    });
    assert.equal(result.ok, true);
    assert.equal(loggedOut, true);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.method, "DELETE");
    assert.match(calls[0]!.url, new RegExp(`${DELETE_ACCOUNT_API_PATH}$`));
    assert.equal(calls[0]!.headers.get("authorization"), `Bearer ${token}`);
    assert.deepEqual(JSON.parse(calls[0]!.body), { password: "p@ss" });
    assert.equal(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY), token);
  });

  it("keeps the session and does not refresh on invalid_password", async () => {
    const token = futureAccessToken();
    setAuthTokens(token, "refresh-token");
    const calls = mockFetch(401, { error: { code: "invalid_password" } });
    let loggedOut = false;
    const result = await submitAccountDeletion({
      password: "wrong",
      request: requestDeleteAccount,
      logout: async () => {
        loggedOut = true;
      },
    });
    assert.deepEqual(result, { ok: false, reason: "invalid_password" });
    assert.equal(loggedOut, false);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.method, "DELETE");
    assert.equal(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY), token);
    assert.equal(localStorage.getItem(AUTH_REFRESH_STORAGE_KEY), "refresh-token");
  });

  it("reports 429 without clearing the session", async () => {
    const token = futureAccessToken();
    setAuthTokens(token);
    const calls = mockFetch(429, { error: { code: "rate_limited" } });
    let loggedOut = false;
    const result = await submitAccountDeletion({
      password: "secret",
      request: requestDeleteAccount,
      logout: async () => {
        loggedOut = true;
      },
    });
    assert.deepEqual(result, { ok: false, reason: "rate_limited" });
    assert.equal(loggedOut, false);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.method, "DELETE");
  });
});
