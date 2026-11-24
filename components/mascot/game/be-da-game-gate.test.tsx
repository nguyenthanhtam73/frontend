import assert from "node:assert/strict";
import { mock, describe, it } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";

import { BeDaGameWait, GAME_GATE_RETRY_MS } from "@/components/mascot/game/be-da-game-gate";
import en from "../../../messages/en.json";
import vi from "../../../messages/vi.json";

function renderWait(retry: boolean, messages: typeof vi = vi, locale = "vi") {
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Ho_Chi_Minh">
      <BeDaGameWait initialRetry={retry} />
    </NextIntlClientProvider>,
  );
}

describe("Bé Da game gate", () => {
  it("shows the opening line, then a retry button after 8 seconds", () => {
    mock.timers.enable({ apis: ["setTimeout"] });
    try {
      let retry = false;
      const timer = setTimeout(() => {
        retry = true;
      }, GAME_GATE_RETRY_MS);
      const loading = renderWait(false);
      assert.match(loading, /Đang mở Bé Da…/);
      assert.equal(loading.includes('data-testid="beda-gate-retry"'), false);
      mock.timers.tick(GAME_GATE_RETRY_MS - 1);
      assert.equal(retry, false);
      mock.timers.tick(1);
      assert.equal(retry, true);
      void timer;
      mock.timers.tick(GAME_GATE_RETRY_MS);
      assert.equal(retry, true);
      const again = renderWait(true);
      assert.match(again, /Đang mở Bé Da…/);
      assert.match(again, /Thử lại/);
      assert.match(again, /data-testid="beda-gate-retry"/);
      const english = renderWait(true, en, "en");
      assert.match(english, /Opening Bé Da…/);
      assert.match(english, /Try again/);
    } finally {
      mock.timers.reset();
    }
  });

  it("has the gift label in Vietnamese and English", () => {
    assert.equal(vi.mascot.game.gift.label, "Có quà");
    assert.equal(en.mascot.game.gift.label, "A gift");
    assert.equal(vi.mascot.game.opening, "Đang mở Bé Da…");
    assert.equal(en.mascot.game.opening, "Opening Bé Da…");
    assert.equal(vi.mascot.game.tryAgain, "Thử lại");
    assert.equal(en.mascot.game.tryAgain, "Try again");
  });
});
