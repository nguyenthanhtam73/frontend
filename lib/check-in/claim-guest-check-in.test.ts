import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import {
  claimLocalGuestCheckInIfNeeded,
  guestCheckInHttpReason,
  isGuestCheckInClaimFailure,
  isGuestCheckInPhotosMissing,
} from "./claim-guest-check-in";
import {
  persistGuestCheckInRecord,
  type GuestCheckInPayload,
} from "./guest-check-in-persist";

const skipPayload: GuestCheckInPayload = {
  skipMode: true,
  title: "",
  userNote: "ok",
  environmentNote: "",
  conditions: ["dry"],
  symptoms: [],
  skillMode: "beginner",
  locale: "vi",
  hasPhotos: false,
};

const photoPayload: GuestCheckInPayload = {
  ...skipPayload,
  skipMode: false,
  hasPhotos: true,
};

function installWindow() {
  const mem = new Map<string, string>();
  const localStorage = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => {
      mem.set(k, String(v));
    },
    removeItem: (k: string) => {
      mem.delete(k);
    },
  };
  const g = globalThis as typeof globalThis & {
    window?: {
      localStorage: typeof localStorage;
      __dadiaryFunnel?: { name: string; params?: Record<string, unknown> }[];
      dataLayer?: Record<string, unknown>[];
    };
  };
  g.window = {
    localStorage,
    __dadiaryFunnel: [],
    dataLayer: [],
  };
  return g.window;
}

function funnelNames() {
  const g = globalThis as typeof globalThis & {
    window?: { __dadiaryFunnel?: { name: string; params?: Record<string, unknown> }[] };
  };
  return g.window?.__dadiaryFunnel ?? [];
}

describe("guestCheckInHttpReason", () => {
  it("formats http_xxx from the status", () => {
    assert.equal(guestCheckInHttpReason(401), "http_401");
    assert.equal(guestCheckInHttpReason(500), "http_500");
  });
});

describe("isGuestCheckInClaimFailure", () => {
  it("treats leftover failures as toastable, not empty no-ops", () => {
    assert.equal(
      isGuestCheckInClaimFailure({ ok: false, reason: "no_payload", data: null }),
      false,
    );
    assert.equal(
      isGuestCheckInClaimFailure({ ok: false, reason: "no_token", data: null }),
      false,
    );
    assert.equal(
      isGuestCheckInClaimFailure({
        ok: false,
        reason: "photos_missing",
        data: null,
      }),
      true,
    );
    assert.equal(
      isGuestCheckInClaimFailure({ ok: false, reason: "http_500", data: null }),
      true,
    );
    assert.equal(isGuestCheckInPhotosMissing("photos_missing"), true);
    assert.equal(isGuestCheckInPhotosMissing("network"), false);
  });
});

describe("claimLocalGuestCheckInIfNeeded", { concurrency: false }, () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete (globalThis as { window?: unknown }).window;
  });

  it("returns no_token without analytics", async () => {
    installWindow();
    const result = await claimLocalGuestCheckInIfNeeded("  ");
    assert.deepEqual(result, { ok: false, reason: "no_token", data: null });
    assert.equal(funnelNames().length, 0);
  });

  it("returns no_payload and tracks a failed claim", async () => {
    installWindow();
    const result = await claimLocalGuestCheckInIfNeeded("tok");
    assert.deepEqual(result, { ok: false, reason: "no_payload", data: null });
    assert.equal(funnelNames()[0]?.name, "guest_checkin_claim");
    assert.deepEqual(funnelNames()[0]?.params, {
      ok: false,
      reason: "no_payload",
    });
  });

  it("returns photos_missing when IDB has no files for a photo check-in", async () => {
    installWindow();
    persistGuestCheckInRecord(photoPayload);
    const result = await claimLocalGuestCheckInIfNeeded("tok");
    assert.equal(result.ok, false);
    assert.equal(result.reason, "photos_missing");
    assert.equal(funnelNames()[0]?.name, "guest_checkin_claim");
    assert.deepEqual(funnelNames()[0]?.params, {
      ok: false,
      reason: "photos_missing",
    });
  });

  it("returns http_xxx when the API rejects the claim", async () => {
    installWindow();
    persistGuestCheckInRecord(skipPayload);
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ success: false }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch;
    const result = await claimLocalGuestCheckInIfNeeded("tok");
    assert.deepEqual(result, { ok: false, reason: "http_422", data: null });
    assert.deepEqual(funnelNames()[0]?.params, {
      ok: false,
      reason: "http_422",
    });
  });

  it("returns network when fetch throws", async () => {
    installWindow();
    persistGuestCheckInRecord(skipPayload);
    globalThis.fetch = (async () => {
      throw new Error("offline");
    }) as typeof fetch;
    const result = await claimLocalGuestCheckInIfNeeded("tok");
    assert.deepEqual(result, { ok: false, reason: "network", data: null });
    assert.deepEqual(funnelNames()[0]?.params, {
      ok: false,
      reason: "network",
    });
  });

  it("clears local payload and fires claim + first check-in on success", async () => {
    installWindow();
    persistGuestCheckInRecord(skipPayload);
    const created = {
      check: {
        id: "sc-1",
        user_id: "u1",
        visibility: "private",
        check_date: "2026-09-08",
        created_at: "t",
      },
      analysis: { skin_check_id: "sc-1", status: "pending" },
      image_urls: [],
    };
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ success: true, data: created }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })) as typeof fetch;
    const result = await claimLocalGuestCheckInIfNeeded("tok");
    assert.equal(result.ok, true);
    assert.equal(result.reason, "ok");
    assert.equal(result.data?.check.id, "sc-1");
    const names = funnelNames().map((e) => e.name);
    assert.deepEqual(names, ["guest_checkin_claim", "activation_first_checkin"]);
    assert.deepEqual(funnelNames()[0]?.params, { ok: true, reason: "ok" });
    assert.deepEqual(funnelNames()[1]?.params, { surface: "guest_claim" });
  });
});
