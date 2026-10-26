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

  it("VI open actions lead with photo, blurred-share privacy, then skip", () => {
    const vi = readCheckIn("vi");
    assert.equal(vi.openTakePhoto, "Chụp ảnh da hôm nay");
    assert.equal(vi.openSaveWithoutPhoto, "Lưu không cần ảnh");
    assert.equal(
      vi.openPhotoPrivacy,
      "Ảnh gốc được giữ riêng tư. Chỉ bản làm mờ mới công khai khi bạn bấm chia sẻ.",
    );
    assert.equal(vi.openPhotoPrivacy.includes("chỉ mình"), false);
  });

  it("EN open photo line says only a blurred copy goes public on share", () => {
    const en = readCheckIn("en");
    assert.equal(
      en.openPhotoPrivacy,
      "Original photos stay private. Only a blurred copy goes public when you tap share.",
    );
  });

  it("register reassurance uses the short blurred-share line", () => {
    for (const [locale, expected] of [
      [
        "vi",
        "Miễn phí · Ảnh gốc giữ riêng tư — chỉ bản làm mờ công khai khi bạn chia sẻ",
      ],
      [
        "en",
        "Free · Original photos stay private — only a blurred copy goes public when you share",
      ],
    ] as const) {
      const json = JSON.parse(
        fs.readFileSync(path.join(ROOT, "messages", `${locale}.json`), "utf8"),
      ) as { auth: { registerReassurance: string } };
      assert.equal(json.auth.registerReassurance, expected);
    }
  });

  it("does not claim photos are never posted publicly", () => {
    const banned = [
      "Ảnh được giữ riêng tư, không đăng công khai",
      "không đăng công khai",
      "không được đăng công khai",
      "not posted publicly",
      "never posted publicly",
      "Photos stay private and are not posted publicly",
      "Photos stay private and are never posted publicly",
      "Ảnh của bạn được bảo vệ, link tự hết hạn sau 1 tiếng.",
      "link tự hết hạn",
      "Your photos are protected; links expire after 1 hour.",
      "links expire after 1 hour",
    ];
    for (const locale of ["vi", "en"] as const) {
      const raw = fs.readFileSync(path.join(ROOT, "messages", `${locale}.json`), "utf8");
      for (const phrase of banned) {
        assert.equal(
          raw.includes(phrase),
          false,
          `${locale}.json still contains ${JSON.stringify(phrase)}`,
        );
      }
    }
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
