import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, it } from "node:test";

import { BeDaGameView, type GameTab } from "@/components/mascot/game/be-da-game-view";
import { defaultSnapshot, resolveBeDaView, type BeDaView } from "@/lib/mascot/model";
import en from "../../../messages/en.json";
import vi from "../../../messages/vi.json";

function player(): BeDaView {
  return resolveBeDaView({
    snapshot: {
      ...defaultSnapshot(),
      isDefault: false,
      mood: "happy",
      glowLevel: 3,
      glowProgress: 0.68,
      nearLevelUp: true,
    },
    missedDays: 0,
    sessionHappy: false,
    locale: "vi",
  });
}

function renderGame(
  extra: Partial<Parameters<typeof BeDaGameView>[0]> = {},
  messages: typeof vi = vi,
  locale = "vi",
) {
  const props: Parameters<typeof BeDaGameView>[0] = {
    locale,
    tab: "care",
    sky: "morning",
    coinsLabel: locale === "en" ? "1,250" : "1.250",
    streakLabel: "7",
    soundOn: true,
    quests: [
      { id: "wash", done: true },
      { id: "spf", done: false },
      { id: "wave", done: false },
    ],
    bubbleKind: "washed",
    progress: 0.68,
    showPrettyLine: true,
    chestOpen: false,
    friendCount: 18,
    selectedFriendId: "keo-deo",
    toast: null,
    wavingId: null,
    outfitHue: 0,
    wornIds: ["outfit_cozy_pajamas", "hair_sleep_buns"],
    hearts: 1,
    streakKept: true,
    giftTaken: false,
    player: player(),
    burst: 0,
    homeHref: "/check-in",
    routineHref: "/routine",
    onTab: () => undefined,
    onToggleSound: () => undefined,
    onSelectFriend: () => undefined,
    onFriendAction: () => undefined,
    onClaim: () => undefined,
    onHue: () => undefined,
    ...extra,
  };
  return renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="Asia/Ho_Chi_Minh">
      <BeDaGameView {...props} />
    </NextIntlClientProvider>,
  );
}

function visibleText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ");
}

function assertNoScores(html: string) {
  const text = visibleText(html);
  assert.equal(/\blevel\b/i.test(text), false);
  assert.equal(/\bpoints?\b/i.test(text), false);
  assert.equal(text.includes("điểm"), false);
  assert.equal(text.includes("cấp độ"), false);
  assert.equal(text.includes("Lv"), false);
}

describe("Bé Da game screen", () => {
  it("shows coins and the care streak, and keeps the idle figure", () => {
    const html = renderGame();
    assert.match(html, /data-testid="beda-coins"/);
    assert.match(html, /1\.250/);
    assert.match(html, /xu/);
    assert.match(html, /data-testid="beda-streak"/);
    assert.match(html, /7/);
    assert.match(html, /chuỗi ngày/);
    assert.match(html, /data-testid="beda-hero"/);
    assert.match(html, /beda-hero-wrap/);
    assert.match(html, /bd-breathe/);
    assert.match(html, /bd-lids/);
    assert.match(html, /Mình rửa mặt rồi nè!/);
    assert.match(html, /Thoa kem chống nắng nha\?/);
    const bubble = html.match(/<p\b[^>]*data-testid="beda-bubble"[^>]*>/)?.[0] ?? "";
    assert.match(bubble, /beda-bubble/);
    assert.equal(bubble.includes("text-foreground"), false);
    assertNoScores(html);
    assert.equal(html.includes('data-testid="beda-lobby"'), false);
  });

  it("speaks English without a score", () => {
    const html = renderGame({}, en, "en");
    const text = visibleText(html);
    assert.match(text, /I washed my face!/);
    assert.match(text, /Sunscreen next\?/);
    assert.match(text, /1,250/);
    assert.match(text, /coins/);
    assert.match(text, /day streak/);
    assert.match(text, /Skin care/);
    assert.match(text, /Lobby/);
    assertNoScores(html);
  });

  it("recolours only the outfit when a swatch is on", () => {
    const html = renderGame({ outfitHue: 40, tab: "wardrobe" satisfies GameTab });
    assert.match(html, /hue-rotate\(40deg\)/);
    assert.match(html, /data-testid="beda-wardrobe"/);
    assert.match(html, /Không mua|không mua/);
    assertNoScores(html);
  });

  it("draws the wide lobby with sample nicknames only", () => {
    const html = renderGame({ tab: "lobby" });
    assert.match(html, /data-testid="beda-lobby"/);
    assert.match(html, /beda-lobby-world/);
    assert.match(html, /Kẹo Dẻo/);
    assert.match(html, /Mèo Máy/);
    assert.match(html, /beda-tag-me/);
    assert.match(visibleText(html), /Bạn/);
    assert.equal((html.match(/data-sample="true"/g) ?? []).length, 17);
    assert.equal(html.includes("@"), false);
    assert.match(html, /18 bạn đang dạo chơi/);
    assert.match(html, /Vẫy tay/);
    assert.match(html, /Thả tim/);
    assert.match(html, /Khen đồ/);
    assertNoScores(html);
  });

  it("opens the gift chest without printing a level", () => {
    const html = renderGame({
      tab: "quests",
      chestOpen: true,
      hearts: 3,
      quests: [
        { id: "wash", done: true },
        { id: "spf", done: true },
        { id: "wave", done: true },
      ],
      bubbleKind: "done",
    });
    assert.match(html, /data-testid="beda-chest"/);
    assert.match(html, /Mở rương quà!/);
    assert.match(html, /Nhận quà/);
    assert.match(html, /\+3 tim/);
    assert.match(html, /Giữ chuỗi/);
    assert.match(html, /1\.250/);
    assert.equal(html.includes('data-testid="beda-hero"'), false);
    assert.match(html, /bd-breathe/);
    assertNoScores(html);
  });
});
