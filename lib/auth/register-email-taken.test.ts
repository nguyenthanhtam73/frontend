import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";

import {
  LOGIN_EMAIL_PREFILL_KEY,
  accountEmailKey,
  buildEmailTakenLoginHref,
  clearLoginPrefillEmail,
  isRegisterEmailTakenResponse,
  isRegisterSubmitHeld,
  readLoginPrefillEmail,
  stashLoginPrefillEmail,
} from "./register-email-taken";

function memoryStore(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(data, key) ? data[key]! : null;
    },
    setItem(key: string, value: string) {
      data[key] = value;
    },
    removeItem(key: string) {
      delete data[key];
    },
    dump() {
      return { ...data };
    },
  };
}

describe("isRegisterEmailTakenResponse", () => {
  it("treats 409 email_taken as an existing account", () => {
    assert.equal(
      isRegisterEmailTakenResponse(409, {
        success: false,
        error: { code: "email_taken", message: "email already registered" },
      }),
      true,
    );
    assert.equal(
      isRegisterEmailTakenResponse(409, {
        error: { code: "email_already_registered", message: "email already registered" },
      }),
      true,
    );
    assert.equal(isRegisterEmailTakenResponse(409, {}), true);
    assert.equal(isRegisterEmailTakenResponse(409, null), true);
  });

  it("leaves other statuses and username conflicts alone", () => {
    assert.equal(
      isRegisterEmailTakenResponse(400, {
        error: { code: "email_taken", message: "email already registered" },
      }),
      false,
    );
    assert.equal(
      isRegisterEmailTakenResponse(422, {
        error: { code: "email_already_registered", message: "email already registered" },
      }),
      false,
    );
    assert.equal(
      isRegisterEmailTakenResponse(409, {
        error: { code: "username_taken", message: "username already taken" },
      }),
      false,
    );
    assert.equal(isRegisterEmailTakenResponse(500, { error: { code: "email_taken" } }), false);
    assert.equal(isRegisterEmailTakenResponse(401, {}), false);
  });
});

describe("isRegisterSubmitHeld", () => {
  it("holds while the request is in flight", () => {
    assert.equal(
      isRegisterSubmitHeld({ inFlight: true, email: "ten@gmail.com", takenEmail: null }),
      true,
    );
  });

  it("holds after a 409 until the address changes", () => {
    const taken = accountEmailKey("  Ten@Gmail.com ");
    assert.equal(
      isRegisterSubmitHeld({ inFlight: false, email: "ten@gmail.com", takenEmail: taken }),
      true,
    );
    assert.equal(
      isRegisterSubmitHeld({ inFlight: false, email: "  TEN@gmail.com  ", takenEmail: taken }),
      true,
    );
    assert.equal(
      isRegisterSubmitHeld({ inFlight: false, email: "other@gmail.com", takenEmail: taken }),
      false,
    );
    assert.equal(
      isRegisterSubmitHeld({ inFlight: false, email: "ten@gmail.com", takenEmail: null }),
      false,
    );
  });
});

describe("login email handoff", { concurrency: false }, () => {
  beforeEach(() => {
    clearLoginPrefillEmail(memoryStore());
  });

  it("stashes the address in session storage and keeps it off the login URL", () => {
    const store = memoryStore();
    stashLoginPrefillEmail("  Ten@Gmail.com ", store);

    const href = buildEmailTakenLoginHref({
      intent: { plan: "premium", interval: "yearly" },
      next: "/onboarding/coach-welcome",
    });

    assert.equal(store.dump()[LOGIN_EMAIL_PREFILL_KEY], "ten@gmail.com");
    assert.equal(href.includes("ten@gmail.com"), false);
    assert.equal(href.includes("email="), false);
    assert.equal(
      href,
      "/login?plan=premium&interval=yearly&next=%2Fonboarding%2Fcoach-welcome",
    );
    assert.equal(readLoginPrefillEmail(store), "ten@gmail.com");
    // Second read still works until clear, matching a strict-mode remount.
    assert.equal(readLoginPrefillEmail(store), "ten@gmail.com");
    clearLoginPrefillEmail(store);
    assert.equal(readLoginPrefillEmail(store), null);
    assert.equal(store.dump()[LOGIN_EMAIL_PREFILL_KEY], undefined);
  });

  it("does not stash an address that fails the format check", () => {
    const store = memoryStore();
    stashLoginPrefillEmail("not-an-email", store);
    assert.equal(readLoginPrefillEmail(store), null);
    assert.deepEqual(store.dump(), {});
  });

  it("drops a stored value that is not an account email", () => {
    const store = memoryStore({ [LOGIN_EMAIL_PREFILL_KEY]: "abc@1995" });
    assert.equal(readLoginPrefillEmail(store), null);
    assert.equal(store.dump()[LOGIN_EMAIL_PREFILL_KEY], undefined);
  });
});
