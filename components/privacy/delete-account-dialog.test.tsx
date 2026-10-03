import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import {
  DeleteAccountDialogPanel,
  type DeleteAccountDialogCopy,
} from "./delete-account-dialog";

function copy(): DeleteAccountDialogCopy {
  const vi = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), "messages/vi.json"), "utf8"),
  ) as { privacy: Record<string, string> };
  const p = vi.privacy;
  return {
    title: p.deleteAccountConfirmTitle!,
    body: p.deleteAccountConfirmBody!,
    passwordLabel: p.deleteAccountPasswordLabel!,
    confirm: p.deleteAccountConfirmCta!,
    cancel: p.deleteAccountCancel!,
    closeAria: p.deleteAccountCloseAria!,
    working: p.deleteAccountWorking!,
    invalidPassword: p.deleteAccountInvalidPassword!,
    rateLimited: p.deleteAccountRateLimited!,
    failed: p.deleteAccountFailed!,
  };
}

const noop = () => {};

describe("delete account dialog", () => {
  it("fits a phone width and keeps the confirm button disabled until a password is typed", () => {
    const html = renderToStaticMarkup(
      <DeleteAccountDialogPanel
        copy={copy()}
        password=""
        error={null}
        busy={false}
        onPasswordChange={noop}
        onConfirm={noop}
        onClose={noop}
      />,
    );
    assert.match(html, /max-h-\[calc\(100dvh-1\.5rem\)\]/);
    assert.match(html, /min-h-11 w-full/);
    assert.match(html, /data-testid="delete-account-confirm"[^>]*disabled/);
  });

  it("shows the wrong-password message", () => {
    const html = renderToStaticMarkup(
      <DeleteAccountDialogPanel
        copy={copy()}
        password="nope"
        error="invalid_password"
        busy={false}
        onPasswordChange={noop}
        onConfirm={noop}
        onClose={noop}
      />,
    );
    assert.match(html, /Mật khẩu chưa đúng\./);
    assert.match(html, /role="alert"/);
  });

  it("shows the too-many-tries message", () => {
    const html = renderToStaticMarkup(
      <DeleteAccountDialogPanel
        copy={copy()}
        password="secret"
        error="rate_limited"
        busy={false}
        onPasswordChange={noop}
        onConfirm={noop}
        onClose={noop}
      />,
    );
    assert.match(html, /Bạn thử nhiều lần quá, đợi một lúc rồi thử lại\./);
    assert.match(html, /role="alert"/);
  });
});
