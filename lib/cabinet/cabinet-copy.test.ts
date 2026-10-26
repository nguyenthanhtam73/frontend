import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { COMPARE_ROWS } from "../premium/pricing";
import {
  FREE_WARDROBE_PRODUCT_LIMIT,
  wardrobeProductLimit,
} from "../types/wardrobe";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function readLocale(locale: "vi" | "en") {
  return JSON.parse(fs.readFileSync(path.join(ROOT, "messages", `${locale}.json`), "utf8")) as {
    metadata: { cabinet: { description: string } };
    cabinet: Record<string, unknown>;
  };
}

function collectStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (value && typeof value === "object") {
    for (const child of Object.values(value as Record<string, unknown>)) collectStrings(child, out);
  }
  return out;
}

describe("free wardrobe product limit", () => {
  it("falls back to 10 and prefers a positive usage limit", () => {
    assert.equal(FREE_WARDROBE_PRODUCT_LIMIT, 10);
    assert.equal(wardrobeProductLimit(undefined), 10);
    assert.equal(wardrobeProductLimit(null), 10);
    assert.equal(wardrobeProductLimit(0), 10);
    assert.equal(wardrobeProductLimit(Number.NaN), 10);
    assert.equal(wardrobeProductLimit(10), 10);
    assert.equal(wardrobeProductLimit(7), 7);
  });

  it("says 10 shelf products and leaves the other Free caps at 3", () => {
    const vi = JSON.parse(fs.readFileSync(path.join(ROOT, "messages/vi.json"), "utf8"));
    const en = JSON.parse(fs.readFileSync(path.join(ROOT, "messages/en.json"), "utf8"));

    assert.match(vi.features.items.cabinet.desc, /tới 10 sản phẩm/);
    assert.doesNotMatch(vi.features.items.cabinet.desc, /3 sản phẩm/);
    assert.match(en.features.items.cabinet.desc, /up to 10 products/);
    assert.doesNotMatch(en.features.items.cabinet.desc, /up to 3 products/);

    assert.match(vi.landingFaq.q2.answer, /Tủ đồ: xem và thêm tối đa 10 sản phẩm/);
    assert.match(vi.landingFaq.q2.answer, /Gợi ý routine AI: 3 lần\/tháng/);
    assert.match(vi.landingFaq.q2.answer, /Progress: khoảng 3 tháng/);
    assert.match(en.landingFaq.q2.answer, /Shelf: view and add up to 10 products/);
    assert.match(en.landingFaq.q2.answer, /AI routine suggestions: 3\/month/);
    assert.match(en.landingFaq.q2.answer, /last 3 months/);

    assert.match(vi.premium.wardrobeBody, /\{n\} sản phẩm/);
    assert.doesNotMatch(vi.premium.wardrobeBody, /3 sản phẩm/);
    assert.match(en.premium.wardrobeBody, /\{n\} products/);

    assert.match(vi.pricing.fromContext.wardrobe_full, /đủ 10 món/);
    assert.match(en.pricing.fromContext.wardrobe_full, /10 items/);
    assert.match(vi.pricing.plans.free.features.f4, /10 sản phẩm tủ đồ/);
    assert.match(vi.pricing.plans.free.features.f4, /Progress 3 tháng/);
    assert.match(en.pricing.plans.free.features.f4, /10 shelf products/);
    assert.match(en.pricing.plans.free.features.f4, /last 3 months/);
    assert.equal(vi.pricing.plans.free.features.f2, "3 gợi ý routine AI / tháng");
    assert.equal(en.pricing.plans.free.features.f2, "3 AI routine suggestions / month");

    assert.equal(vi.pricing.compare.values.shelf, "Tối đa {n} sản phẩm");
    assert.equal(en.pricing.compare.values.shelf, "Up to {n} products");
    assert.equal("shelf3" in vi.pricing.compare.values, false);
    assert.equal("shelf3" in en.pricing.compare.values, false);
    assert.equal(vi.pricing.compare.values.quota3, "3 / tháng");
    assert.equal(vi.pricing.compare.values.months3, "3 tháng");
    assert.equal(
      COMPARE_ROWS.find((row) => row.key === "wardrobe")?.free,
      "shelf",
    );

    assert.match(vi.pricing.faq.q1.answer, /tới 10 sản phẩm vào tủ đồ/);
    assert.match(en.pricing.faq.q1.answer, /up to 10 shelf products/);
    assert.match(vi.cabinet.sub, /tới 10 sản phẩm/);
    assert.match(en.cabinet.sub, /up to 10 products/);
    assert.match(vi.cabinet.starterAddHint, /\{n\} suất/);
    assert.match(en.cabinet.starterAddHint, /\{n\}-product/);
    assert.match(vi.cabinet.premiumWardrobeBody, /\{n\} sản phẩm/);
    assert.match(en.cabinet.premiumWardrobeBody, /\{n\} products/);
    assert.doesNotMatch(vi.cabinet.sub, /3 sản phẩm/);
    assert.doesNotMatch(en.cabinet.sub, /3 products/);
  });
});

describe("cabinet user-facing copy", () => {
  it("does not say affiliate or PAO on the shelf, in Vietnamese or English", () => {
    for (const locale of ["vi", "en"] as const) {
      const messages = readLocale(locale);
      const blobs = [
        ...collectStrings(messages.cabinet),
        messages.metadata.cabinet.description,
      ];
      for (const text of blobs) {
        assert.doesNotMatch(text, /affiliate/i, `${locale}: ${text}`);
        assert.doesNotMatch(text, /\bPAO\b/, `${locale}: ${text}`);
      }
    }
  });

  it("talks about finishing the product in everyday Vietnamese", () => {
    const { cabinet } = readLocale("vi");
    assert.equal(
      cabinet.paoHintFreshFixed,
      "Mới mở. Nên dùng hết trong {months} tháng sau khi mở (gợi ý nhẹ, không phải hạn sử dụng).",
    );
    assert.equal(
      cabinet.paoHintFreshRange,
      "Mới mở. Nên dùng hết trong {min} đến {max} tháng sau khi mở (gợi ý nhẹ, không phải hạn sử dụng).",
    );
    assert.equal(
      cabinet.paoHintFixed,
      "Đã mở khoảng {monthsOpen} tháng. Nên dùng hết trong {months} tháng sau khi mở.",
    );
    assert.equal(
      cabinet.paoHintRange,
      "Đã mở khoảng {monthsOpen} tháng. Nên dùng hết trong {min} đến {max} tháng sau khi mở.",
    );
    assert.equal(
      cabinet.paoHintOverWindow,
      "Đã mở quá thời gian gợi ý, bạn cân nhắc thay món mới.",
    );
    assert.match(cabinet.paoAddOpenedCta as string, /Thêm ngày mở/);
    const insight = cabinet.insight as {
      keepUsing: string;
      pauseUsing: string;
      unknownUsing: string;
      unknownUsingWhy: string;
    };
    assert.equal(insight.keepUsing, "Nên dùng tiếp");
    assert.equal(insight.pauseUsing, "Chưa nên dùng tiếp");
    assert.equal(insight.unknownUsing, "Chưa biết có nên dùng tiếp");
    assert.equal(
      insight.unknownUsingWhy,
      "Để ý da vài tuần, thấy khô rát hay nổi mụn thêm thì tạm dừng.",
    );
    assert.notEqual(insight.unknownUsing, insight.pauseUsing);
    assert.doesNotMatch(insight.keepUsing, /mua/i);
    assert.doesNotMatch(insight.pauseUsing, /mua/i);
    assert.doesNotMatch(insight.unknownUsing, /mua/i);
    assert.doesNotMatch(insight.unknownUsingWhy, /mua/i);

    const en = readLocale("en").cabinet.insight as {
      keepUsing: string;
      pauseUsing: string;
      unknownUsing: string;
      unknownUsingWhy: string;
    };
    assert.equal(en.keepUsing, "Keep using");
    assert.equal(en.pauseUsing, "Don't keep using");
    assert.equal(en.unknownUsing, "Not sure if you should keep using this");
    assert.equal(
      en.unknownUsingWhy,
      "Watch your skin for a few weeks. If it feels dry and sore, or more spots show up, pause for now.",
    );
  });

  it("keeps opened-date hints free of tildes and dashes, and drops the unused brand placeholder", () => {
    const paoKeys = [
      "paoHintFreshFixed",
      "paoHintFreshRange",
      "paoHintFixed",
      "paoHintRange",
      "paoHintOverWindow",
      "paoAddOpenedCta",
    ];
    for (const locale of ["vi", "en"] as const) {
      const { cabinet } = readLocale(locale);
      assert.equal("placeholderBrand" in cabinet, false, locale);
      assert.equal(typeof cabinet.placeholderBrandOptional, "string", locale);
      for (const key of paoKeys) {
        const text = cabinet[key];
        assert.equal(typeof text, "string", `${locale}.${key}`);
        assert.doesNotMatch(text as string, /~|—|–/, `${locale}.${key} ${text}`);
        assert.doesNotMatch(text as string, /\{min\}\s*[-–—]\s*\{max\}/, `${locale}.${key}`);
      }
    }

    const en = readLocale("en").cabinet;
    assert.equal(
      en.paoHintFreshFixed,
      "Just opened. You should finish it within {months, plural, one {# month} other {# months}} of opening (a gentle hint, not an expiry date).",
    );
    assert.equal(
      en.paoHintFreshRange,
      "Just opened. You should finish it within {min} to {max} months of opening (a gentle hint, not an expiry date).",
    );
    assert.equal(
      en.paoHintFixed,
      "Opened about {monthsOpen, plural, one {# month} other {# months}}. You should finish it within {months, plural, one {# month} other {# months}} of opening.",
    );
    assert.equal(
      en.paoHintRange,
      "Opened about {monthsOpen, plural, one {# month} other {# months}}. You should finish it within {min} to {max} months of opening.",
    );
    assert.equal(
      en.paoHintOverWindow,
      "Opened longer than the suggested time. You may want to replace it with a new one.",
    );
    assert.equal(en.placeholderBrandOptional, "e.g. brand name on the label (optional)");
    assert.equal(
      readLocale("vi").cabinet.placeholderBrandOptional,
      "VD: tên hãng trên nhãn (không bắt buộc)",
    );
  });

  it("caps add and edit opened dates at today in Vietnam", () => {
    const form = fs.readFileSync(
      path.join(ROOT, "components/cabinet/wardrobe-product-form.tsx"),
      "utf8",
    );
    const edit = fs.readFileSync(
      path.join(ROOT, "components/cabinet/wardrobe-product-edit-dialog.tsx"),
      "utf8",
    );
    assert.match(form, /max=\{vietnamDateKey\(\)\}/);
    assert.match(form, /clampOpenedDate/);
    assert.match(edit, /max=\{openedDateMax\}/);
    assert.match(edit, /clampOpenedDate/);
    assert.match(edit, /noValidate/);
  });

  it("does not reference the removed brand placeholder in source", () => {
    const roots = ["app", "components", "lib"].map((dir) => path.join(ROOT, dir));
    const files: string[] = [];
    function walk(dir: string) {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name === ".next") continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.(tsx|ts)$/.test(entry.name) && !entry.name.endsWith(".test.ts")) files.push(full);
      }
    }
    for (const root of roots) walk(root);
    for (const file of files) {
      const source = fs.readFileSync(file, "utf8");
      assert.doesNotMatch(source, /["']placeholderBrand["']/, path.relative(ROOT, file));
    }
  });
});
