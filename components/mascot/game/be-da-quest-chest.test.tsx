import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, it } from "node:test";

import { BeDaQuestChest } from "@/components/mascot/game/be-da-quest-chest";
import vi from "../../../messages/vi.json";

function renderChest(phase: "ready" | "reward" | "error", preview?: { coins: number; balance: number | null; item: { name: string; src: string } | null }) {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale="vi" messages={vi} timeZone="Asia/Ho_Chi_Minh">
      <BeDaQuestChest
        locale="vi"
        hearts={3}
        initialPhase={phase}
        preview={preview ?? null}
        onClaim={() => undefined}
        onClose={() => undefined}
      />
    </NextIntlClientProvider>,
  );
}

describe("quest chest modal", () => {
  it("shows +N xu and a  Nhận button after a coin grant", () => {
    const html = renderChest("reward", { coins: 18, balance: 1268, item: null });
    assert.match(html, /data-phase="reward"/);
    assert.match(html, /data-testid="beda-chest-plus"/);
    assert.match(html, /\+18 xu/);
    assert.match(html, /Mày chăm quá, quà của mày nè!/);
    assert.match(html, /data-testid="beda-chest-take"/);
    assert.match(html, />Nhận</);
    assert.equal((html.match(/mày/gi) ?? []).length, 2);
    assert.equal(html.includes("bạn"), false);
    assert.equal(html.includes("mình"), false);
  });

  it("shows the hearts when the grant is empty", () => {
    const html = renderChest("reward", { coins: 0, balance: null, item: null });
    assert.match(html, /data-testid="beda-chest-hearts"/);
    assert.match(html, /\+3 tim/);
    assert.equal(html.includes("+0 xu"), false);
  });

  it("shows a friendly line when the claim fails", () => {
    const html = renderChest("error");
    assert.match(html, /data-testid="beda-chest-error"/);
    assert.match(html, /Chưa nhận được, thử lại nha/);
    assert.match(html, /data-testid="beda-chest-retry"/);
    assert.equal(/404|stack|undefined|exception/i.test(html), false);
  });
});
