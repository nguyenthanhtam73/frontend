import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readMessages(locale: "vi" | "en") {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, "messages", `${locale}.json`), "utf8"),
  ) as {
    coachWelcome: Record<string, string>;
    checkIn: {
      guestLocal: Record<string, string> & {
        wait?: Record<string, string>;
      };
    };
  };
}

describe("guest check-in copy policy", () => {
  it("does not tell guests they must sign up before check-in", () => {
    const vi = readMessages("vi");
    const blob = JSON.stringify({
      coachWelcome: vi.coachWelcome,
      guestLocal: vi.checkIn.guestLocal,
    });
    assert.equal(blob.includes("rồi mới check-in"), false);
    assert.equal(vi.coachWelcome.nextStepHintGuest.includes("Check-in thử"), true);
    assert.equal(
      vi.coachWelcome.ctaGuestRegisterToCheckIn,
      "Đăng ký để lưu nhật ký & soi da dài hạn",
    );
  });

  it("keeps guest AI-wait copy local-only (no server-saved claim)", () => {
    const vi = readMessages("vi");
    const wait = vi.checkIn.guestLocal.wait;
    assert.ok(wait);
    const blob = JSON.stringify(wait);
    assert.equal(blob.includes("rồi mới check-in"), false);
    assert.equal(blob.includes("máy chủ"), true);
    assert.equal(wait.savedLocal.includes("máy này"), true);
    assert.equal(wait.hint.includes("Đăng ký để lưu nhật ký"), true);
    assert.equal(wait.status1.includes("chưa gửi lên máy chủ"), true);
  });

  it("matches the locked EN equivalents", () => {
    const en = readMessages("en");
    const blob = JSON.stringify({
      coachWelcome: en.coachWelcome,
      guestLocal: en.checkIn.guestLocal,
    });
    assert.equal(/then you can check in/i.test(blob), false);
    assert.equal(
      en.coachWelcome.ctaGuestRegisterToCheckIn.includes("journal"),
      true,
    );
    const wait = en.checkIn.guestLocal.wait;
    assert.ok(wait);
    assert.equal(/then you can check in/i.test(JSON.stringify(wait)), false);
    assert.equal(wait.savedLocal.toLowerCase().includes("device"), true);
    assert.equal(wait.hint.toLowerCase().includes("sign up"), true);
  });
});
