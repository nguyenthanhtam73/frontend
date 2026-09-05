import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ProgressEntryDTO } from "@/lib/types/progress";

import {
  BEFORE_AFTER_CARD_HEIGHT,
  BEFORE_AFTER_CARD_WIDTH,
  beforeAfterCardLayout,
  beforeAfterShareFilename,
  calendarDaysBetween,
  canSharePhotoPair,
  coverSourceRect,
  flattenProgressPhotos,
  formatShareDate,
  isSameSharePhoto,
  mergeCheckInIntoEntries,
  rectInside,
  rectsOverlap,
  safeShareFilename,
  sharePhotoKey,
  wrapLines,
  type SharePhotoRef,
} from "./before-after";

function photo(partial: Partial<SharePhotoRef> & Pick<SharePhotoRef, "entryId" | "url">): SharePhotoRef {
  return {
    imageIndex: 0,
    date: "2026-08-01",
    ...partial,
  };
}

function entry(id: string, date: string, urls: string[]): ProgressEntryDTO {
  return {
    id,
    check_date: date,
    created_at: `${date}T00:00:00+07:00`,
    image_urls: urls,
    status: "completed",
  };
}

describe("formatShareDate", () => {
  it("formats YYYY-MM-DD as DD/MM/YYYY", () => {
    assert.equal(formatShareDate("2026-09-05"), "05/09/2026");
    assert.equal(formatShareDate("2026-01-02"), "02/01/2026");
  });

  it("passes through malformed values", () => {
    assert.equal(formatShareDate("yesterday"), "yesterday");
    assert.equal(formatShareDate(""), "");
  });
});

describe("calendarDaysBetween", () => {
  it("counts inclusive-exclusive calendar days", () => {
    assert.equal(calendarDaysBetween("2026-08-01", "2026-08-15"), 14);
    assert.equal(calendarDaysBetween("2026-09-05", "2026-09-05"), 0);
  });

  it("returns null for bad dates", () => {
    assert.equal(calendarDaysBetween("nope", "2026-09-05"), null);
    assert.equal(calendarDaysBetween("2026-09-05", ""), null);
  });
});

describe("share photo identity", () => {
  it("treats the same entry+index as the same photo", () => {
    const a = photo({ entryId: "c1", imageIndex: 0, url: "/uploads/a.jpg" });
    const b = photo({ entryId: "c1", imageIndex: 0, url: "/uploads/a.jpg" });
    assert.equal(isSameSharePhoto(a, b), true);
    assert.equal(canSharePhotoPair(a, b), false);
    assert.equal(sharePhotoKey(a), "c1#0");
  });

  it("treats identical URLs as the same photo even across entries", () => {
    const a = photo({ entryId: "c1", url: "/uploads/same.jpg" });
    const b = photo({ entryId: "c2", url: "/uploads/same.jpg" });
    assert.equal(isSameSharePhoto(a, b), true);
    assert.equal(canSharePhotoPair(a, b), false);
  });

  it("allows two distinct photos, including same-day shots", () => {
    const a = photo({ entryId: "c1", imageIndex: 0, url: "/uploads/a.jpg", date: "2026-09-05" });
    const b = photo({ entryId: "c1", imageIndex: 1, url: "/uploads/b.jpg", date: "2026-09-05" });
    assert.equal(canSharePhotoPair(a, b), true);
  });

  it("rejects missing sides or empty urls", () => {
    assert.equal(canSharePhotoPair(null, photo({ entryId: "c1", url: "/uploads/a.jpg" })), false);
    assert.equal(
      canSharePhotoPair(
        photo({ entryId: "c1", url: "   " }),
        photo({ entryId: "c2", url: "/uploads/b.jpg" }),
      ),
      false,
    );
  });
});

describe("flatten + merge check-in", () => {
  it("flattens every image on an entry", () => {
    const items = flattenProgressPhotos([
      entry("new", "2026-09-05", ["/uploads/n.jpg", "/uploads/n2.jpg"]),
      entry("old", "2026-08-01", ["/uploads/o.jpg"]),
    ]);
    assert.equal(items.length, 3);
    assert.equal(items[0]?.entryId, "new");
    assert.equal(items[0]?.imageIndex, 0);
    assert.equal(items[1]?.imageIndex, 1);
    assert.equal(items[2]?.entryId, "old");
  });

  it("skips blank urls", () => {
    assert.deepEqual(flattenProgressPhotos([entry("e", "2026-09-05", ["", "  "])]), []);
  });

  it("prepends a just-submitted check-in that is not on the timeline yet", () => {
    const existing = [entry("old", "2026-08-01", ["/uploads/o.jpg"])];
    const merged = mergeCheckInIntoEntries(existing, {
      id: "fresh",
      check_date: "2026-09-05",
      created_at: "2026-09-05T08:00:00+07:00",
      image_urls: ["/uploads/n.jpg"],
      title: "Today",
    });
    assert.equal(merged[0]?.id, "fresh");
    assert.equal(merged[0]?.status, "completed");
    assert.equal(merged.length, 2);
  });

  it("does not duplicate an entry that is already present", () => {
    const existing = [entry("fresh", "2026-09-05", ["/uploads/n.jpg"])];
    const merged = mergeCheckInIntoEntries(existing, {
      id: "fresh",
      check_date: "2026-09-05",
      image_urls: ["/uploads/other.jpg"],
    });
    assert.equal(merged.length, 1);
    assert.deepEqual(merged[0]?.image_urls, ["/uploads/n.jpg"]);
  });

  it("ignores a check-in with no photos", () => {
    const existing = [entry("old", "2026-08-01", ["/uploads/o.jpg"])];
    assert.equal(
      mergeCheckInIntoEntries(existing, { id: "skip", check_date: "2026-09-05", image_urls: [] }).length,
      1,
    );
  });
});

describe("filenames", () => {
  it("sanitizes dates and keeps a .png suffix", () => {
    assert.equal(
      beforeAfterShareFilename("2026-08-01", "2026-09-05"),
      "dadiary-before-after-2026-08-01-to-2026-09-05.png",
    );
    assert.equal(safeShareFilename("Da Diary!! streak"), "Da-Diary-streak.png");
    assert.equal(safeShareFilename("///"), "dadiary-share.png");
  });
});

describe("coverSourceRect", () => {
  it("crops the wider source on the sides", () => {
    const r = coverSourceRect(2000, 1000, 100, 100);
    assert.equal(r.sh, 1000);
    assert.ok(Math.abs(r.sw - 1000) < 1e-6);
    assert.ok(Math.abs(r.sx - 500) < 1e-6);
    assert.equal(r.sy, 0);
  });

  it("crops the taller source on the top/bottom", () => {
    const r = coverSourceRect(1000, 2000, 100, 100);
    assert.equal(r.sw, 1000);
    assert.ok(Math.abs(r.sh - 1000) < 1e-6);
    assert.ok(Math.abs(r.sy - 500) < 1e-6);
    assert.equal(r.sx, 0);
  });

  it("handles degenerate sizes", () => {
    assert.deepEqual(coverSourceRect(0, 10, 100, 100), { sx: 0, sy: 0, sw: 0, sh: 10 });
  });
});

describe("beforeAfterCardLayout", () => {
  it("keeps photo slots inside the canvas and not overlapping", () => {
    const layout = beforeAfterCardLayout();
    assert.equal(layout.width, BEFORE_AFTER_CARD_WIDTH);
    assert.equal(layout.height, BEFORE_AFTER_CARD_HEIGHT);
    const canvas = { x: 0, y: 0, w: layout.width, h: layout.height };
    assert.equal(rectInside(layout.before, canvas), true);
    assert.equal(rectInside(layout.after, canvas), true);
    assert.equal(rectInside(layout.header, canvas), true);
    assert.equal(rectInside(layout.footer, canvas), true);
    assert.equal(rectsOverlap(layout.before, layout.after), false);
    assert.equal(rectsOverlap(layout.before, layout.header), false);
    assert.equal(rectsOverlap(layout.after, layout.footer), false);
    assert.ok(layout.before.w > 200);
    assert.ok(layout.after.h > 200);
  });
});

describe("wrapLines", () => {
  const measure = (s: string) => s.length;

  it("keeps short text on one line", () => {
    assert.deepEqual(wrapLines("hello there", 20, measure), ["hello there"]);
  });

  it("wraps and ellipsizes when over the line budget", () => {
    const lines = wrapLines("one two three four five six", 8, measure, 2);
    assert.equal(lines.length, 2);
    assert.ok(lines[1]!.endsWith("…"));
    assert.ok(lines.every((l) => measure(l) <= 8));
  });

  it("returns empty for blank input", () => {
    assert.deepEqual(wrapLines("   ", 10, measure), []);
  });
});
