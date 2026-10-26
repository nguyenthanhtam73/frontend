import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { SUPPORT_EMAIL, SUPPORT_EMAIL_PLACEHOLDER } from "@/lib/config";

type Json = Record<string, unknown>;

function load(locale: "vi" | "en"): Json {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "messages", `${locale}.json`), "utf8"),
  ) as Json;
}

function leafKeys(value: unknown, prefix = ""): string[] {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.entries(value as Json).flatMap(([key, child]) =>
      leafKeys(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [prefix];
}

describe("privacy policy copy", () => {
  it("uses the pending support inbox until the owner sets one", () => {
    assert.equal(
      SUPPORT_EMAIL,
      process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || SUPPORT_EMAIL_PLACEHOLDER,
    );
    assert.match(SUPPORT_EMAIL_PLACEHOLDER, /@dadiary\.vn$/);
  });

  it("covers Play topics in Vietnamese and English with the same keys", () => {
    const vi = load("vi");
    const en = load("en");
    const viPrivacy = (vi.legal as Json).privacy;
    const enPrivacy = (en.legal as Json).privacy;
    assert.deepEqual(leafKeys(viPrivacy).sort(), leafKeys(enPrivacy).sort());

    const viText = JSON.stringify(viPrivacy);
    const enText = JSON.stringify(enPrivacy);
    for (const phrase of [
      "email",
      "Ảnh da",
      "ghi chú check-in",
      "Tủ đồ",
      "bên thứ ba",
      "OpenAI",
      "Claude",
      "Anthropic",
      "làm mờ",
      "1 giờ",
      "không được dùng để dạy AI",
      "10 năm",
      "xoá",
      "token thông báo đẩy",
      "giờ nhắc",
      "múi giờ",
      "Tắt nhắc",
    ]) {
      assert.match(viText, new RegExp(phrase));
    }
    for (const phrase of [
      "email",
      "Skin photos",
      "Check-in notes",
      "skincare shelf",
      "third-party",
      "OpenAI",
      "Claude",
      "Anthropic",
      "blurred",
      "1 hour",
      "not used to train",
      "10 years",
      "delete",
      "push token",
      "reminder time",
      "time zone",
      "Reminders off",
    ]) {
      assert.match(enText, new RegExp(phrase, "i"));
    }

    const viFooter = (vi.common as Json).footer as Json;
    const enFooter = (en.common as Json).footer as Json;
    assert.equal(typeof viFooter.privacy, "string");
    assert.equal(typeof enFooter.privacy, "string");
    assert.equal(viFooter.deleteAccount, "Xoá tài khoản");
    assert.equal(enFooter.deleteAccount, "Delete account");

    assert.match(viText, /Cập nhật: tháng 10\/2026/);
    assert.match(enText, /Updated: October 2026/);
    assert.doesNotMatch(viText, /Ảnh không được đăng công khai/);
    assert.doesNotMatch(viText, /Hiện mình dùng OpenAI/);
    assert.doesNotMatch(enText, /Photos are not posted publicly/);
    assert.doesNotMatch(enText, /Right now that provider is OpenAI/);
  });
});
