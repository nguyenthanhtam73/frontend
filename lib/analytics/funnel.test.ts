import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  FUNNEL_EVENTS,
  TIKTOK_STANDARD_BY_CUSTOM,
  claimOnceFlag,
  funnelEventForCheckInKind,
  funnelOnceKey,
  isFunnelEventName,
  paywallViewParams,
  reportPaywallView,
  resolveCheckInFunnelKinds,
  trackRegisterConversion,
} from "./funnel";

describe("funnel analytics", () => {
  it("exports guest → paid funnel events", () => {
    assert.equal(FUNNEL_EVENTS.photoAdded, "onboarding_photo_added");
    assert.equal(FUNNEL_EVENTS.photosSubmitted, "onboarding_photos_submitted");
    assert.equal(FUNNEL_EVENTS.routineShown, "onboarding_routine_shown");
    assert.equal(FUNNEL_EVENTS.routineAccepted, "onboarding_routine_accepted");
    assert.equal(FUNNEL_EVENTS.signupCtaClick, "onboarding_signup_cta_click");
    assert.equal(FUNNEL_EVENTS.registerSuccess, "onboarding_register_success");
    assert.equal(
      FUNNEL_EVENTS.firstCheckInCtaClick,
      "activation_first_checkin_cta_click",
    );
    assert.equal(FUNNEL_EVENTS.firstCheckIn, "activation_first_checkin");
    assert.equal(FUNNEL_EVENTS.guestCheckInSave, "guest_checkin_save");
    assert.equal(FUNNEL_EVENTS.guestCheckInClaim, "guest_checkin_claim");
    assert.equal(FUNNEL_EVENTS.guestCheckInClaimFail, "guest_checkin_claim_fail");
    assert.equal(FUNNEL_EVENTS.checkInFormView, "checkin_form_view");
    assert.equal(FUNNEL_EVENTS.checkInPhotoStaged, "checkin_photo_staged");
    assert.equal(FUNNEL_EVENTS.checkInPhotoBlurShown, "checkin_photo_blur_shown");
    assert.equal(FUNNEL_EVENTS.checkInPhotoBlurChoice, "checkin_photo_blur_choice");
    assert.equal(FUNNEL_EVENTS.checkInSkipSelected, "checkin_skip_selected");
    assert.equal(FUNNEL_EVENTS.checkInSubmitAttempt, "checkin_submit_attempt");
    assert.equal(FUNNEL_EVENTS.checkInSubmitFail, "checkin_submit_fail");
    assert.equal(FUNNEL_EVENTS.d1CheckIn, "activation_d1_checkin");
    assert.equal(FUNNEL_EVENTS.d1ReminderShown, "activation_d1_reminder_shown");
    assert.equal(FUNNEL_EVENTS.pushOptIn, "activation_push_opt_in");
    assert.equal(FUNNEL_EVENTS.pushDismissed, "activation_push_dismissed");
    assert.equal(FUNNEL_EVENTS.paywallView, "paywall_view");
    assert.equal(FUNNEL_EVENTS.checkoutConfirm, "checkout_confirm");
    assert.equal(FUNNEL_EVENTS.paid, "paid");
  });

  it("accepts only known funnel event names", () => {
    assert.equal(isFunnelEventName("onboarding_routine_shown"), true);
    assert.equal(isFunnelEventName("activation_first_checkin"), true);
    assert.equal(isFunnelEventName("guest_checkin_save"), true);
    assert.equal(isFunnelEventName("guest_checkin_claim"), true);
    assert.equal(isFunnelEventName("guest_checkin_claim_fail"), true);
    assert.equal(isFunnelEventName("checkin_form_view"), true);
    assert.equal(isFunnelEventName("checkin_photo_staged"), true);
    assert.equal(isFunnelEventName("checkin_photo_blur_shown"), true);
    assert.equal(isFunnelEventName("checkin_photo_blur_choice"), true);
    assert.equal(isFunnelEventName("checkin_skip_selected"), true);
    assert.equal(isFunnelEventName("checkin_submit_attempt"), true);
    assert.equal(isFunnelEventName("checkin_submit_fail"), true);
    assert.equal(isFunnelEventName("paywall_view"), true);
    assert.equal(isFunnelEventName("Purchase"), false);
  });

  it("maps TikTok standards without renaming check-in custom events", () => {
    assert.equal(TIKTOK_STANDARD_BY_CUSTOM[FUNNEL_EVENTS.checkInSubmitAttempt]?.event, "SubmitForm");
    assert.equal(TIKTOK_STANDARD_BY_CUSTOM[FUNNEL_EVENTS.checkInSubmitAttempt]?.once, false);
    assert.equal(TIKTOK_STANDARD_BY_CUSTOM[FUNNEL_EVENTS.signupCtaClick]?.event, "ClickButton");
    assert.equal(TIKTOK_STANDARD_BY_CUSTOM[FUNNEL_EVENTS.photosSubmitted]?.event, "ViewContent");
    assert.equal(TIKTOK_STANDARD_BY_CUSTOM[FUNNEL_EVENTS.firstCheckIn], undefined);
    assert.equal(TIKTOK_STANDARD_BY_CUSTOM[FUNNEL_EVENTS.checkInFormView], undefined);
    assert.equal(TIKTOK_STANDARD_BY_CUSTOM[FUNNEL_EVENTS.checkInPhotoStaged], undefined);
    assert.equal(TIKTOK_STANDARD_BY_CUSTOM[FUNNEL_EVENTS.checkInPhotoBlurShown], undefined);
    assert.equal(TIKTOK_STANDARD_BY_CUSTOM[FUNNEL_EVENTS.checkInPhotoBlurChoice], undefined);
    assert.equal(TIKTOK_STANDARD_BY_CUSTOM[FUNNEL_EVENTS.checkInSkipSelected], undefined);
    assert.equal(TIKTOK_STANDARD_BY_CUSTOM[FUNNEL_EVENTS.checkInSubmitFail], undefined);
    assert.equal(TIKTOK_STANDARD_BY_CUSTOM[FUNNEL_EVENTS.guestCheckInClaim], undefined);
    assert.equal(TIKTOK_STANDARD_BY_CUSTOM[FUNNEL_EVENTS.guestCheckInClaimFail], undefined);
    assert.equal(TIKTOK_STANDARD_BY_CUSTOM[FUNNEL_EVENTS.registerSuccess], undefined);
  });
});

describe("resolveCheckInFunnelKinds", () => {
  it("emits first on a D0 first check-in", () => {
    assert.deepEqual(
      resolveCheckInFunnelKinds({ neverCheckedIn: true, reminderKind: "d0" }),
      ["first"],
    );
  });

  it("emits first + d1 when the first check-in is a day-1 return", () => {
    assert.deepEqual(
      resolveCheckInFunnelKinds({ neverCheckedIn: true, reminderKind: "d1" }),
      ["first", "d1"],
    );
  });

  it("emits only d1 when they already have history but missed yesterday", () => {
    assert.deepEqual(
      resolveCheckInFunnelKinds({ neverCheckedIn: false, reminderKind: "d1" }),
      ["d1"],
    );
  });

  it("emits nothing for keep / already-checked-in / unknown", () => {
    assert.deepEqual(
      resolveCheckInFunnelKinds({ neverCheckedIn: false, reminderKind: "keep" }),
      [],
    );
    assert.deepEqual(
      resolveCheckInFunnelKinds({ neverCheckedIn: false, reminderKind: null }),
      [],
    );
  });

  it("maps kinds to stable event names", () => {
    assert.equal(
      funnelEventForCheckInKind("first"),
      FUNNEL_EVENTS.firstCheckIn,
    );
    assert.equal(funnelEventForCheckInKind("d1"), FUNNEL_EVENTS.d1CheckIn);
  });
});

describe("paywallViewParams", () => {
  it("defaults feature to generic and keeps recommended plan", () => {
    assert.deepEqual(
      paywallViewParams({ surface: "upsell_banner" }),
      { surface: "upsell_banner", feature: "generic" },
    );
    assert.deepEqual(
      paywallViewParams({
        surface: "pricing",
        feature: "ai_routine_suggestion",
        recommendedPlan: "premium",
      }),
      {
        surface: "pricing",
        feature: "ai_routine_suggestion",
        recommended_plan: "premium",
      },
    );
    assert.deepEqual(
      paywallViewParams({ surface: "upgrade", feature: "  " }),
      { surface: "upgrade", feature: "generic" },
    );
  });
});

describe("reportPaywallView", () => {
  it("does not persist on SSR (no window)", () => {
    assert.equal(typeof window, "undefined");
    assert.equal(reportPaywallView({ surface: "pricing", feature: "generic" }), false);
  });

  it("posts ingest only the first time a scope is claimed", async () => {
    const g = globalThis as typeof globalThis & {
      window?: { dataLayer?: Record<string, unknown>[]; __dadiaryFunnel?: unknown[] };
      sessionStorage?: Storage;
    };
    const mem = new Map<string, string>();
    const store = {
      get length() {
        return mem.size;
      },
      clear() {
        mem.clear();
      },
      getItem(key: string) {
        return mem.get(key) ?? null;
      },
      key() {
        return null;
      },
      removeItem(key: string) {
        mem.delete(key);
      },
      setItem(key: string, value: string) {
        mem.set(key, value);
      },
    } as Storage;
    const originalFetch = globalThis.fetch;
    const urls: string[] = [];
    g.window = { dataLayer: [], __dadiaryFunnel: [] } as unknown as typeof g.window;
    g.sessionStorage = store;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      urls.push(String(input));
      return new Response(
        JSON.stringify({ success: true, data: { id: "1", logged_at: "t" } }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    try {
      assert.equal(
        reportPaywallView({ surface: "pricing", feature: "generic" }, "pricing:generic"),
        true,
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
      assert.equal(urls.length, 1);
      assert.match(urls[0]!, /\/api\/v1\/analytics\/paywall-view$/);
      assert.equal(
        reportPaywallView({ surface: "pricing", feature: "generic" }, "pricing:generic"),
        false,
      );
      await new Promise((resolve) => setTimeout(resolve, 20));
      assert.equal(urls.length, 1);
    } finally {
      globalThis.fetch = originalFetch;
      delete (g as { window?: unknown }).window;
      delete (g as { sessionStorage?: unknown }).sessionStorage;
    }
  });
});

describe("trackRegisterConversion", () => {
  type Mem = Map<string, string>;

  function memoryStorage(initial?: Record<string, string>): { store: Storage; mem: Mem } {
    const mem: Mem = new Map(Object.entries(initial ?? {}));
    const store = {
      get length() {
        return mem.size;
      },
      clear() {
        mem.clear();
      },
      getItem(key: string) {
        return mem.has(key) ? mem.get(key)! : null;
      },
      key(index: number) {
        return [...mem.keys()][index] ?? null;
      },
      removeItem(key: string) {
        mem.delete(key);
      },
      setItem(key: string, value: string) {
        mem.set(key, value);
      },
    } as Storage;
    return { store, mem };
  }

  function withPixels(
    run: (spies: { ttq: unknown[][]; fbq: unknown[][]; local: Mem; session: Mem }) => void,
    seed?: { local?: Record<string, string>; session?: Record<string, string> },
  ) {
    const prevEnv = process.env.NODE_ENV;
    const g = globalThis as typeof globalThis & {
      window?: unknown;
      localStorage?: Storage;
      sessionStorage?: Storage;
    };
    const prevWindow = g.window;
    const prevLocal = g.localStorage;
    const prevSession = g.sessionStorage;
    const local = memoryStorage(seed?.local);
    const session = memoryStorage(seed?.session);
    const ttq: unknown[][] = [];
    const fbq: unknown[][] = [];
    process.env.NODE_ENV = "production";
    g.localStorage = local.store;
    g.sessionStorage = session.store;
    g.window = {
      location: { hostname: "dadiary.vn", pathname: "/register" },
      localStorage: local.store,
      sessionStorage: session.store,
      ttq: {
        track: (...args: unknown[]) => {
          ttq.push(args);
        },
      },
      fbq: (...args: unknown[]) => {
        fbq.push(args);
      },
    };
    try {
      run({ ttq, fbq, local: local.mem, session: session.mem });
    } finally {
      process.env.NODE_ENV = prevEnv;
      g.window = prevWindow;
      g.localStorage = prevLocal;
      g.sessionStorage = prevSession;
    }
  }

  it("does nothing on the server", () => {
    assert.equal(typeof window, "undefined");
    assert.equal(trackRegisterConversion("user_ssr"), false);
  });

  it("fires both TikTok events and Meta once, with one register_<userId>", () => {
    withPixels(({ ttq, fbq, local, session }) => {
      assert.equal(trackRegisterConversion("user_123"), true);
      assert.deepEqual(ttq, [
        [
          "CompleteRegistration",
          { status: true, content_name: "register" },
          { event_id: "register_user_123" },
        ],
        ["SubmitForm", { content_name: "register" }, { event_id: "register_user_123" }],
      ]);
      assert.deepEqual(fbq, [
        [
          "track",
          "CompleteRegistration",
          { status: true },
          { eventID: "register_user_123" },
        ],
      ]);
      assert.equal(local.get("dadiary_register_pixel_user_123"), "1");
      assert.equal(session.get("dadiary_register_pixel_user_123"), "1");
      const dumped = JSON.stringify({ ttq, fbq, local: [...local], session: [...session] });
      assert.equal(dumped.includes("@"), false);
      assert.equal(dumped.includes("email"), false);

      assert.equal(trackRegisterConversion("user_123"), false);
      assert.equal(ttq.length, 2);
      assert.equal(fbq.length, 1);
    });
  });

  it("keeps hyphens in a user id and still fires for a different user", () => {
    withPixels(({ ttq, fbq }) => {
      const id = "550e8400-e29b-41d4-a716-446655440000";
      assert.equal(trackRegisterConversion(id), true);
      assert.equal(
        (ttq[0]?.[2] as { event_id: string }).event_id,
        `register_${id}`,
      );
      assert.equal((fbq[0]?.[3] as { eventID: string }).eventID, `register_${id}`);
      assert.equal(trackRegisterConversion("user_other"), true);
      assert.equal(ttq.length, 4);
      assert.equal(
        (ttq[2]?.[2] as { event_id: string }).event_id,
        "register_user_other",
      );
    });
  });

  it("skips when either storage already recorded this user", () => {
    withPixels(
      ({ ttq, fbq }) => {
        assert.equal(trackRegisterConversion("user_local"), false);
        assert.equal(ttq.length, 0);
        assert.equal(fbq.length, 0);
      },
      { local: { dadiary_register_pixel_user_local: "1" } },
    );
    withPixels(
      ({ ttq }) => {
        assert.equal(trackRegisterConversion("user_session"), false);
        assert.equal(ttq.length, 0);
      },
      { session: { dadiary_register_pixel_user_session: "1" } },
    );
  });

  it("does not put an email in the id, and only fires that anonymous id once", () => {
    withPixels(({ ttq, fbq, local, session }) => {
      assert.equal(trackRegisterConversion("person@example.com"), true);
      assert.equal(trackRegisterConversion(undefined), false);
      assert.equal(ttq.length, 2);
      assert.equal(fbq.length, 1);
      const eventId = (ttq[0]?.[2] as { event_id: string }).event_id;
      assert.match(eventId, /^register_s_[a-z0-9]+$/);
      assert.equal((ttq[1]?.[2] as { event_id: string }).event_id, eventId);
      assert.equal((fbq[0]?.[3] as { eventID: string }).eventID, eventId);
      const dumped = JSON.stringify({
        ttq,
        fbq,
        local: [...local],
        session: [...session],
      });
      assert.equal(dumped.includes("person@example.com"), false);
      assert.equal(dumped.includes("@"), false);
    });
  });

  it("still sends a stable id when storage is blocked", () => {
    const prevEnv = process.env.NODE_ENV;
    const g = globalThis as typeof globalThis & {
      window?: unknown;
      localStorage?: Storage;
      sessionStorage?: Storage;
    };
    const prevWindow = g.window;
    const prevLocal = g.localStorage;
    const prevSession = g.sessionStorage;
    const throwing = {
      getItem() {
        throw new Error("blocked");
      },
      setItem() {
        throw new Error("blocked");
      },
    } as unknown as Storage;
    const ttq: unknown[][] = [];
    process.env.NODE_ENV = "production";
    g.localStorage = throwing;
    g.sessionStorage = throwing;
    g.window = {
      location: { hostname: "dadiary.vn" },
      ttq: {
        track: (...args: unknown[]) => {
          ttq.push(args);
        },
      },
      fbq: () => {},
    };
    try {
      assert.equal(trackRegisterConversion("user_blocked"), true);
      assert.equal(trackRegisterConversion("user_blocked"), true);
      assert.equal(ttq.length, 4);
      assert.equal(
        (ttq[0]?.[2] as { event_id: string }).event_id,
        "register_user_blocked",
      );
      assert.equal(
        (ttq[2]?.[2] as { event_id: string }).event_id,
        "register_user_blocked",
      );
    } finally {
      process.env.NODE_ENV = prevEnv;
      g.window = prevWindow;
      g.localStorage = prevLocal;
      g.sessionStorage = prevSession;
    }
  });
});

describe("claimOnceFlag", () => {
  it("builds a stable once key and claims it once", () => {
    assert.equal(
      funnelOnceKey("paywall_view", "upsell:wardrobe_full"),
      "dadiary_funnel_once_paywall_view:upsell:wardrobe_full",
    );
    const mem = new Map<string, string>();
    const store = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v);
      },
    };
    assert.equal(claimOnceFlag(store, "k"), true);
    assert.equal(claimOnceFlag(store, "k"), false);
    assert.equal(claimOnceFlag(null, "k"), true);
  });
});
