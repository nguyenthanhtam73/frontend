import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, it } from "node:test";

import {
  AD_ATTRIBUTION_STORAGE_KEY,
  AD_ATTRIBUTION_TTL_MS,
  FBCLID_MAX_LENGTH,
  REGISTER_ATTRIBUTION_FIELDS,
  TTCLID_MAX_LENGTH,
  UTM_MAX_RUNES,
  buildRegisterAttribution,
  captureAdAttribution,
  readStoredAdAttribution,
} from "./ad-attribution";

const DAY_MS = 24 * 60 * 60 * 1000;
const T0 = 1_700_000_000_000;

function installMemoryStorage() {
  const mem = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => mem.get(key) ?? null,
    setItem: (key: string, value: string) => {
      mem.set(key, String(value));
    },
    removeItem: (key: string) => {
      mem.delete(key);
    },
  };
  (globalThis as unknown as { window: { localStorage: typeof localStorage } }).window = {
    localStorage,
  };
  return mem;
}

describe("ad attribution storage", () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("stores landing params and lets the latest non-empty click replace a field", () => {
    installMemoryStorage();
    captureAdAttribution(
      "?utm_source=facebook&utm_medium=cpc&utm_campaign=spring&utm_content=video_tu_do&utm_term=mun&fbclid=fb.1&ttclid=tt.1",
      T0,
    );
    captureAdAttribution("?utm_source=tiktok&utm_campaign=summer&ttclid=tt.2", T0 + DAY_MS);

    assert.deepEqual(readStoredAdAttribution(T0 + DAY_MS), {
      utm_source: "tiktok",
      utm_medium: "cpc",
      utm_campaign: "summer",
      utm_content: "video_tu_do",
      utm_term: "mun",
      fbclid: "fb.1",
      ttclid: "tt.2",
    });
  });

  it("does not overwrite a stored value with an empty or missing param", () => {
    installMemoryStorage();
    captureAdAttribution(
      "utm_source=facebook&utm_medium=cpc&fbclid=abc&utm_term=keep",
      T0,
    );
    captureAdAttribution("?utm_source=&utm_medium=paid&utm_campaign=&fbclid=", T0 + 1);

    assert.deepEqual(readStoredAdAttribution(T0 + 1), {
      utm_source: "facebook",
      utm_medium: "paid",
      utm_term: "keep",
      fbclid: "abc",
    });
  });

  it("uses the last non-empty value when a param is repeated", () => {
    installMemoryStorage();
    captureAdAttribution("?utm_source=facebook&utm_source=&utm_source=tiktok", T0);
    assert.equal(readStoredAdAttribution(T0).utm_source, "tiktok");
  });

  it("ignores a landing that has no ad params and does not extend the 30-day window", () => {
    const mem = installMemoryStorage();
    captureAdAttribution("?utm_source=facebook&next=/pricing", T0);
    const first = mem.get(AD_ATTRIBUTION_STORAGE_KEY);
    captureAdAttribution("?next=/register&plan=pro", T0 + 10 * DAY_MS);
    assert.equal(mem.get(AD_ATTRIBUTION_STORAGE_KEY), first);
    assert.equal(readStoredAdAttribution(T0 + AD_ATTRIBUTION_TTL_MS - 1).utm_source, "facebook");
    assert.deepEqual(readStoredAdAttribution(T0 + AD_ATTRIBUTION_TTL_MS), {});
  });

  it("expires stored params 30 days after the last click that had params", () => {
    installMemoryStorage();
    captureAdAttribution("?utm_source=facebook&utm_campaign=old", T0);
    assert.equal(
      readStoredAdAttribution(T0 + AD_ATTRIBUTION_TTL_MS - 1).utm_campaign,
      "old",
    );
    assert.deepEqual(readStoredAdAttribution(T0 + AD_ATTRIBUTION_TTL_MS), {});

    captureAdAttribution("?utm_source=facebook&utm_campaign=old", T0);
    captureAdAttribution("?utm_source=tiktok", T0 + 10 * DAY_MS);
    const stillValid = T0 + 10 * DAY_MS + AD_ATTRIBUTION_TTL_MS - 1;
    assert.equal(readStoredAdAttribution(stillValid).utm_source, "tiktok");
    assert.equal(readStoredAdAttribution(stillValid).utm_campaign, "old");
    assert.deepEqual(
      readStoredAdAttribution(T0 + 10 * DAY_MS + AD_ATTRIBUTION_TTL_MS),
      {},
    );
  });

  it("does not merge a new click into an expired set", () => {
    installMemoryStorage();
    captureAdAttribution("?utm_source=facebook&utm_campaign=old&fbclid=stale", T0);
    captureAdAttribution("?utm_source=tiktok", T0 + AD_ATTRIBUTION_TTL_MS);
    assert.deepEqual(readStoredAdAttribution(T0 + AD_ATTRIBUTION_TTL_MS), {
      utm_source: "tiktok",
    });
  });

  it("decodes the landing query the way the browser does", () => {
    installMemoryStorage();
    captureAdAttribution("?utm_content=video_tu_do&utm_campaign=Da+m%E1%BB%A5n", T0);
    const stored = readStoredAdAttribution(T0);
    assert.equal(stored.utm_content, "video_tu_do");
    assert.equal(stored.utm_campaign, "Da mụn");
  });

  it("is SSR-safe and does not throw when storage is unavailable", () => {
    assert.equal(typeof window, "undefined");
    assert.doesNotThrow(() => captureAdAttribution("?utm_source=facebook", T0));
    assert.deepEqual(readStoredAdAttribution(T0), {});

    (globalThis as unknown as { window: { localStorage: unknown } }).window = {
      localStorage: {
        getItem() {
          throw new Error("denied");
        },
        setItem() {
          throw new Error("denied");
        },
        removeItem() {
          throw new Error("denied");
        },
      },
    };
    assert.doesNotThrow(() => captureAdAttribution("?utm_source=facebook&fbclid=abc", T0));
    assert.doesNotThrow(() => readStoredAdAttribution(T0));
    assert.deepEqual(readStoredAdAttribution(T0), {});

    (globalThis as unknown as { window: object }).window = {};
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });
    assert.doesNotThrow(() => captureAdAttribution("?utm_source=facebook", T0));
    assert.deepEqual(readStoredAdAttribution(T0), {});
  });

  it("drops a corrupted record instead of throwing", () => {
    const mem = installMemoryStorage();
    mem.set(AD_ATTRIBUTION_STORAGE_KEY, "{not-json");
    assert.deepEqual(readStoredAdAttribution(T0), {});
    assert.equal(mem.has(AD_ATTRIBUTION_STORAGE_KEY), false);
  });
});

describe("register attribution payload", () => {
  it("sends stored values under attribution with the backend field names and omits empties", () => {
    const attribution = buildRegisterAttribution({
      utm_source: "tiktok",
      utm_medium: " paid social ",
      utm_campaign: "launch",
      utm_content: "video_tu_do",
      utm_term: "mun",
      fbclid: "AbC.123_xy-z",
      ttclid: "tt.clid-1",
    });
    assert.deepEqual(attribution, {
      utm_source: "tiktok",
      utm_medium: "paid social",
      utm_campaign: "launch",
      utm_content: "video_tu_do",
      fbclid: "AbC.123_xy-z",
      ttclid: "tt.clid-1",
    });
    assert.equal(Object.hasOwn(attribution ?? {}, "utm_term"), false);
    for (const key of Object.keys(attribution ?? {})) {
      assert.ok(
        (REGISTER_ATTRIBUTION_FIELDS as readonly string[]).includes(key),
        key,
      );
    }

    const body = {
      email: "ada@example.com",
      password: "password1",
      ...(attribution ? { attribution } : {}),
    };
    assert.deepEqual(JSON.parse(JSON.stringify(body)), {
      email: "ada@example.com",
      password: "password1",
      attribution: {
        utm_source: "tiktok",
        utm_medium: "paid social",
        utm_campaign: "launch",
        utm_content: "video_tu_do",
        fbclid: "AbC.123_xy-z",
        ttclid: "tt.clid-1",
      },
    });
  });

  it("omits the attribution object when every field is empty", () => {
    assert.equal(buildRegisterAttribution({}), undefined);
    assert.equal(buildRegisterAttribution(null), undefined);
    assert.equal(
      buildRegisterAttribution({ utm_source: "  ", utm_medium: "", utm_term: "mun" }),
      undefined,
    );
  });

  it("applies backend length and format limits before send", () => {
    const letter = "\u{1D400}";
    const longCampaign = buildRegisterAttribution({
      utm_campaign: letter.repeat(UTM_MAX_RUNES + 20),
    })?.utm_campaign;
    assert.equal(Array.from(longCampaign ?? "").length, UTM_MAX_RUNES);
    assert.equal(longCampaign, letter.repeat(UTM_MAX_RUNES));

    assert.equal(
      buildRegisterAttribution({ utm_source: "a".repeat(150) })?.utm_source?.length,
      UTM_MAX_RUNES,
    );
    assert.equal(buildRegisterAttribution({ utm_content: "Da mụn" })?.utm_content, "Da mụn");
    assert.equal(
      buildRegisterAttribution({ utm_content: "person@example.com" }),
      undefined,
    );
    assert.equal(buildRegisterAttribution({ utm_source: "tik\u0000tok" })?.utm_source, "tiktok");
    assert.equal(buildRegisterAttribution({ utm_source: "tiktok<>" }), undefined);

    const fbclid = buildRegisterAttribution({ fbclid: "c".repeat(300) })?.fbclid;
    assert.equal(fbclid, "c".repeat(FBCLID_MAX_LENGTH));
    const ttclid = buildRegisterAttribution({ ttclid: "t".repeat(300) })?.ttclid;
    assert.equal(ttclid, "t".repeat(TTCLID_MAX_LENGTH));
    assert.equal(buildRegisterAttribution({ ttclid: "tt.clid~1" }), undefined);
    assert.equal(buildRegisterAttribution({ fbclid: "bad id" }), undefined);
  });
});

describe("register page wiring", () => {
  const pageSrc = fs.readFileSync(
    path.join(process.cwd(), "app/[locale]/(marketing)/register/page.tsx"),
    "utf8",
  );

  it("sends register pixels once through the shared helper, without the email", () => {
    const calls = pageSrc.match(/trackRegisterConversion\(/g) ?? [];
    assert.equal(calls.length, 1);
    assert.match(pageSrc, /trackRegisterConversion\(json\.data\?\.user\?\.id\)/);
    const callAt = pageSrc.indexOf("trackRegisterConversion(");
    assert.equal(pageSrc.slice(callAt, callAt + 80).includes("email"), false);
    assert.equal(pageSrc.includes('trackTikTokEvent("CompleteRegistration"'), false);
    assert.equal(pageSrc.includes('trackTikTokEvent("SubmitForm"'), false);
    assert.equal(pageSrc.includes('trackMetaEvent("CompleteRegistration"'), false);
  });

  it("adds the stored attribution object to the register request body", () => {
    assert.match(pageSrc, /buildRegisterAttribution\(readStoredAdAttribution\(\)\)/);
    assert.match(pageSrc, /body\.attribution = attribution/);
  });
});
