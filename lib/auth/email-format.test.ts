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

  it("accepts a dotted domain and a letter TLD of at least 2", () => {
    assert.equal(isValidAccountEmail("ten@gmail.com"), true);
    assert.equal(isValidAccountEmail("a.b+tag@sub.domain.vn"), true);
    assert.equal(isValidAccountEmail("user.name+tag@example.co.uk"), true);
    assert.equal(isValidAccountEmail("  Ten@Gmail.COM  "), true);
  });

  it("rejects missing domain, a TLD shorter than 2 letters, and spaces", () => {
    assert.equal(isValidAccountEmail("abc@1995"), false);
    assert.equal(isValidAccountEmail("danghaiduong@1995"), false);
    assert.equal(isValidAccountEmail("abc"), false);
    assert.equal(isValidAccountEmail("abc@gmail"), false);
    assert.equal(isValidAccountEmail("abc @gmail.com"), false);
    assert.equal(isValidAccountEmail("  ABC@1995  "), false);
    assert.equal(isValidAccountEmail("user@gmail.c"), false);
    assert.equal(isValidAccountEmail("user@domain.123"), false);
    assert.equal(isValidAccountEmail("user@localhost"), false);
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

  it("maps error.code invalid_email from POST /auth/register", () => {
    assert.equal(
      isRegisterInvalidEmailResponse(400, {
        success: false,
        error: {
          code: "invalid_email",
          message: "Email chưa đúng, ví dụ: ten@gmail.com",
        },
      }),
      true,
    );
    assert.equal(
      isRegisterInvalidEmailResponse(400, { error: { code: "invalid_email" } }),
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
    assert.equal(
      isRegisterInvalidEmailResponse(400, {
        error: { code: "invalid_input", message: "email and password are required" },
      }),
      false,
    );
    assert.equal(isRegisterInvalidEmailResponse(400, {}), false);
    assert.equal(isRegisterInvalidEmailResponse(401, { error: { message: "unauthorized" } }), false);
  });
});
