import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { SUPPORT_EMAIL, SUPPORT_EMAIL_PLACEHOLDER } from "@/lib/config";

import { DeleteAccountDoc, type DeleteAccountCopy } from "./delete-account-doc";

function pageCopy(): DeleteAccountCopy {
  const vi = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "messages/vi.json"), "utf8"),
  ) as {
    legal: {
      deleteAccount: Omit<
        DeleteAccountCopy,
        "steps" | "facebookLabel" | "tiktokLabel" | "retentionPayments" | "retentionStats"
      > & {
        steps: Record<string, string>;
        retention: { payments: string; stats: string };
      };
    };
    common: { footer: { social: { facebook: string; tiktok: string } } };
  };
  const src = vi.legal.deleteAccount;
  const { steps, retention, ...rest } = src;
  return {
    ...rest,
    steps: ["s1", "s2", "s3", "s4"].map((key) => steps[key]!),
    retentionPayments: retention.payments,
    retentionStats: retention.stats,
    facebookLabel: vi.common.footer.social.facebook,
    tiktokLabel: vi.common.footer.social.tiktok,
  };
}

describe("public delete-account page", () => {
  it("renders the help article without asking anyone to sign in first", () => {
    const html = renderToStaticMarkup(
      <DeleteAccountDoc
        copy={pageCopy()}
        privacyHref="/privacy"
        homeHref="/"
        settingsHref="/settings"
      />,
    );
    assert.match(html, /data-testid="delete-account-page"/);
    assert.match(html, /Xoá tài khoản DaDiary/);
    assert.match(html, /không cần đăng nhập/);
    assert.match(html, /Trên web hoặc trong app, bạn đăng nhập\./);
    assert.match(html, /Mở trang <a href="\/settings"[^>]*>Cài đặt<\/a>\./);
    assert.match(html, /Bấm “Xoá tài khoản”\./);
    assert.match(html, /Nhập lại mật khẩu, rồi xác nhận\./);
    assert.match(html, /ảnh da và nhật ký/);
    assert.match(html, /sản phẩm trong tủ/);
    assert.match(html, /nhắc nhở/);
    assert.match(html, /đăng xuất/);
    assert.match(html, /data-retention-block="kept-data"/);
    assert.match(html, /không có tên hay email/);
    assert.match(html, /lâu nhất là 10 năm/);
    assert.match(html, /không gắn với bạn/);
    assert.match(html, /được giữ lâu dài/);
    assert.match(html, /không lấy lại được/);
    assert.match(html, /cùng email/);
    assert.match(html, /Gói Premium đang dùng \(nếu có\) sẽ mất khi xoá tài khoản và không được hoàn tiền\./);
    assert.match(html, /Nếu bạn quên mật khẩu hoặc không đăng nhập được/);
    assert.match(html, new RegExp(`href="mailto:${SUPPORT_EMAIL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"`));
    assert.equal(SUPPORT_EMAIL, process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || SUPPORT_EMAIL_PLACEHOLDER);
    assert.match(html, /Nếu bạn không đăng nhập được/);
    assert.doesNotMatch(html, /password-reset|forgot-password|\/reset/);
    assert.match(html, /href="\/privacy"/);
    assert.match(html, /href="https:\/\/www\.facebook\.com\/dadiary\.vn"/);
    assert.match(html, /href="https:\/\/www\.tiktok\.com\/@dadiary8"/);
    assert.doesNotMatch(html, /type="password"/);
  });
});
