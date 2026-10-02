import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

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
    const insight = cabinet.insight as { keepUsing: string; pauseUsing: string };
    assert.equal(insight.keepUsing, "Nên dùng tiếp");
    assert.equal(insight.pauseUsing, "Chưa nên dùng tiếp");
    assert.doesNotMatch(insight.keepUsing, /mua/i);
    assert.doesNotMatch(insight.pauseUsing, /mua/i);
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
