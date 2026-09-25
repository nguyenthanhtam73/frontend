import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isRegisterInvalidEmailResponse,
  isValidAccountEmail,
  normalizeAccountEmail,
} from "./email-format";

describe("account email format", () => {
  it("trims whitespace before checking", () => {
    assert.equal(normalizeAccountEmail("  ten@gmail.com  "), "ten@gmail.com");
    assert.equal(isValidAccountEmail("  ten@gmail.com  "), true);
    assert.equal(isValidAccountEmail("\ta.b+tag@sub.domain.vn\n"), true);
  });

  it("accepts a domain and letter TLD", () => {
    assert.equal(isValidAccountEmail("ten@gmail.com"), true);
    assert.equal(isValidAccountEmail("a.b+tag@sub.domain.vn"), true);
    assert.equal(isValidAccountEmail("Ten@Gmail.COM"), true);
  });

  it("rejects missing domain, missing TLD, and spaces", () => {
    assert.equal(isValidAccountEmail("abc@1995"), false);
    assert.equal(isValidAccountEmail("danghaiduong@1995"), false);
    assert.equal(isValidAccountEmail("abc"), false);
    assert.equal(isValidAccountEmail("abc@gmail"), false);
    assert.equal(isValidAccountEmail("abc @gmail.com"), false);
    assert.equal(isValidAccountEmail("abc@gmail .com"), false);
    assert.equal(isValidAccountEmail("ten@gmail.com extra"), false);
    assert.equal(isValidAccountEmail(""), false);
    assert.equal(isValidAccountEmail("   "), false);
  });
});

describe("register invalid-email responses", () => {
  it("maps 400/422 bodies that mention email", () => {
    assert.equal(
      isRegisterInvalidEmailResponse(400, {
        error: { code: "bad_request", message: "email format is invalid" },
      }),
      true,
    );
    assert.equal(
      isRegisterInvalidEmailResponse(422, {
        error: { code: "validation_error", message: "Email is not valid" },
      }),
      true,
    );
    assert.equal(
      isRegisterInvalidEmailResponse(422, {
        error: { message: "Key: 'Email' Error:Field validation for 'Email' failed" },
      }),
      true,
    );
  });

  it("maps known invalid-email codes on any 4xx", () => {
    assert.equal(
      isRegisterInvalidEmailResponse(400, { error: { code: "invalid_email" } }),
      true,
    );
    assert.equal(
      isRegisterInvalidEmailResponse(409, {
        error: { code: "invalid_email_format", message: "nope" },
      }),
      true,
    );
  });

  it("leaves unrelated and already-registered errors alone", () => {
    assert.equal(
      isRegisterInvalidEmailResponse(400, {
        error: { code: "bad_request", message: "password too short" },
      }),
      false,
    );
    assert.equal(
      isRegisterInvalidEmailResponse(422, {
        error: { code: "email_already_registered", message: "email already registered" },
      }),
      false,
    );
    assert.equal(
      isRegisterInvalidEmailResponse(400, {
        error: { message: "Email đã được đăng ký" },
      }),
      false,
    );
    assert.equal(
      isRegisterInvalidEmailResponse(500, {
        error: { code: "invalid_email", message: "email" },
      }),
      false,
    );
    assert.equal(isRegisterInvalidEmailResponse(400, {}), false);
    assert.equal(isRegisterInvalidEmailResponse(401, { error: { message: "unauthorized" } }), false);
  });
});
