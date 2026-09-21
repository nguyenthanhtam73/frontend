import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readCheckIn(locale: "vi" | "en") {
  const json = JSON.parse(
    fs.readFileSync(path.join(ROOT, "messages", `${locale}.json`), "utf8"),
  ) as {
    checkIn: Record<string, string> & {
      firstVisit: Record<string, string>;
    };
  };
  return json.checkIn;
}

describe("D0 never_checked_in check-in copy", () => {
  it("VI sticky actions match the product lock", () => {
    const vi = readCheckIn("vi");
    assert.equal(vi.d0StickyTakePhoto, "Chụp ảnh");
    assert.equal(vi.d0StickySkipNoPhoto, "Gửi không ảnh");
    assert.equal(vi.d0StickySkipDefaultNote, "Check-in không ảnh — lần đầu");
  });

  it("says one face photo is enough in VI and EN", () => {
    const vi = readCheckIn("vi");
    const en = readCheckIn("en");
    for (const blob of [
      vi.d0PageSub,
      vi.d0HeroStepPhotoDesc,
      vi.d0PhotoHint,
      vi.d0PhotoTitle,
      vi.firstVisit.body,
    ]) {
      assert.match(blob, /một tấm ảnh mặt là đủ/i);
    }
    for (const blob of [
      en.d0PageSub,
      en.d0HeroStepPhotoDesc,
      en.d0PhotoHint,
      en.d0PhotoTitle,
      en.firstVisit.body,
    ]) {
      assert.match(blob, /one face photo is enough/i);
    }
  });

  it("EN sticky actions stay the skip / take-photo pair", () => {
    const en = readCheckIn("en");
    assert.equal(en.d0StickyTakePhoto, "Take photo");
    assert.equal(en.d0StickySkipNoPhoto, "Send without photo");
    assert.equal(en.d0StickySkipDefaultNote, "First check-in without photo");
  });
});
