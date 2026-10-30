import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function checkIn(locale: "vi" | "en") {
  const json = JSON.parse(
    fs.readFileSync(path.join(ROOT, "messages", `${locale}.json`), "utf8"),
  ) as { checkIn: Record<string, string> };
  return json.checkIn;
}

describe("check-in blur warning copy", () => {
  it("uses the Vietnamese product strings", () => {
    const vi = checkIn("vi");
    assert.equal(vi.photoBlurWarning, "Ảnh hơi mờ, bạn giữ máy yên và chụp lại nhé");
    assert.equal(vi.photoBlurRetake, "Chụp lại");
    assert.equal(vi.photoBlurSendAnyway, "Vẫn gửi ảnh này");
  });

  it("has an English equivalent", () => {
    const en = checkIn("en");
    assert.equal(
      en.photoBlurWarning,
      "This photo looks a bit blurry. Hold the phone still and take it again.",
    );
    assert.equal(en.photoBlurRetake, "Retake");
    assert.equal(en.photoBlurSendAnyway, "Send this photo anyway");
  });
});
