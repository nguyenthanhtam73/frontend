import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { describe, it } from "node:test";

import { BeDaGameView, type GameTab } from "@/components/mascot/game/be-da-game-view";
import { sampleSpaGuests } from "@/lib/mascot/game/spa-room";
import { DEFAULT_GAME_LOOK, type GameLook } from "@/lib/mascot/game/look";
import { gameRoomView } from "@/lib/mascot/game/room-view";
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
    look: DEFAULT_GAME_LOOK,
    wornIds: ["outfit_cozy_pajamas", "hair_sleep_buns"],
    hearts: 1,
    streakKept: true,
    giftTaken: false,
    player: player(),
    burst: 0,
    homeHref: "/check-in",
    onTab: () => undefined,
    onToggleSound: () => undefined,
    onSelectFriend: () => undefined,
    onFriendAction: () => undefined,
    onClaim: () => undefined,
    onLook: () => undefined,
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
    assert.match(html, /\/mascot\/outfits\/outfit_pajamas\.svg/);
    assert.match(html, /\/mascot\/icons\/xu_coin\.svg/);
    assert.match(html, /\/mascot\/icons\/streak_flame\.svg/);
    assert.match(html, /\/mascot\/icons\/nav_cham_da\.svg/);
    assert.match(html, /\/mascot\/icons\/nav_tu_do\.svg/);
    assert.equal(html.includes("hue-rotate"), false);
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

  it("wears a real outfit, hair, and clip from the closet", () => {
    const look: GameLook = {
      outfit: "outfit_ao_dai",
      hair: "hair_twin_tails",
      clip: "accessory_flower_clip",
    };
    const html = renderGame({ look, tab: "wardrobe" satisfies GameTab });
    assert.match(html, /data-testid="beda-wardrobe"/);
    assert.match(html, /\/mascot\/outfits\/outfit_ao_dai\.svg/);
    assert.match(html, /\/mascot\/hair\/hair_twin_tails\.svg/);
    assert.match(html, /\/mascot\/accessory\/accessory_flower_clip\.svg/);
    assert.match(html, /Áo dài/);
    assert.match(html, /Váy hoa/);
    assert.match(html, /Kẹp hoa/);
    assert.match(html, /Không mua|không mua/);
    assert.equal(html.includes("hue-rotate"), false);
    assert.match(html, /aria-label="Áo dài"[^>]*aria-pressed="true"/);
    assert.match(html, /aria-label="Tóc hai bên"[^>]*aria-pressed="true"/);
    assert.match(html, /aria-label="Kẹp hoa"[^>]*aria-pressed="true"/);
    assert.match(html, /aria-label="Hoodie"[^>]*aria-pressed="false"/);
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
    assert.match(html, /Sảnh 1 · 18\/28 người/);
    assert.match(html, /data-testid="beda-hall"/);
    assert.match(html, /data-lobby-mode="sample"/);
    assert.match(html, /Ẩn bạn này/);
    assert.match(html, /Bạn sẽ không thấy bạn này nữa/);
    assert.match(html, /Bé Da 4821/);
    assert.equal(html.includes("access_token"), false);
    assert.equal(html.includes('data-testid="beda-coins"'), false);
    assert.equal(html.includes('data-testid="beda-streak"'), false);
    assert.equal(html.includes("room_pillow"), false);
    assert.equal(html.includes("room_plant"), false);
    assert.equal(html.includes("room_moon"), false);
    assert.equal(html.includes("zzz.svg"), false);
    assert.equal(html.includes("sparkles.svg"), false);
    assert.equal(html.includes("accessory_star_clip"), false);
    assert.equal(html.includes("faces/sleepy"), false);
    assert.match(html, /\/mascot\/faces\/happy\/eyes\.svg/);
    assert.match(html, /\/mascot\/outfits\/outfit_hoodie\.svg/);
    assert.match(html, /\/mascot\/outfits\/outfit_vay_hoa\.svg/);
    assert.equal(html.includes("/mascot/props/wardrobe"), false);
    assert.equal(html.includes("/mascot/props/sink.svg"), false);
    assert.match(html, /\/mascot\/icons\/minimap_pin\.svg/);
    assert.equal(html.includes("beda-mini"), false);
    assert.match(html, /data-testid="beda-zoom"/);
    assert.match(html, /Về Bé Da/);
    assert.match(html, /\/mascot\/icons\/wave\.svg/);
    assert.equal(html.includes("hue-rotate"), false);
    assert.match(html, /Vẫy tay/);
    assert.match(html, /Thả tim/);
    assert.match(html, /Khen đồ/);
    assert.match(html, /data-testid="beda-actions"/);
    assert.match(html, /Tạo phòng/);
    assert.match(html, /Nhập mã/);
    assert.match(html, /data-testid="beda-create-room"/);
    assert.match(html, /translate\(-50%, -100%\)/);
    assert.match(html, /--nudge:-?\d+px/);
    assert.equal(html.includes("left:12px"), false);
    assert.equal(html.includes("right:12px"), false);
    assertNoScores(html);
  });

  it("draws the 8-person spa room with an invite code and no chat", () => {
    const html = renderGame({
      selectedFriendId: "tra-sua",
      spa: {
        code: "DA7K2M",
        count: 5,
        cap: 8,
        guests: sampleSpaGuests(new Set()),
        notice: null,
      },
    });
    const text = visibleText(html);
    assert.match(html, /data-testid="beda-spa"/);
    assert.match(text, /Phòng nhóm · 5\/8/);
    assert.match(text, /8 chỗ · còn 3/);
    assert.match(text, /Mã mời vào phòng/);
    assert.match(text, /Sao chép mã/);
    assert.match(text, /Gửi qua Zalo/);
    assert.match(text, /Ra sảnh/);
    assert.match(text, /Trà Sữa/);
    assert.match(text, /Mây Hồng/);
    assert.match(text, /Ốc Quế/);
    assert.match(text, /Bánh Flan/);
    assert.match(html, /data-testid="beda-spa-you"/);
    assert.equal(html.includes("room_pillow"), false);
    assert.equal(html.includes("room_plant"), false);
    assert.equal(html.includes("zzz.svg"), false);
    assert.equal(html.includes("sparkles.svg"), false);
    assert.equal(html.includes("faces/sleepy"), false);
    assert.match(html, /\/mascot\/faces\/happy\/eyes\.svg/);
    assert.equal((html.match(/class="beda-cuke /g) ?? []).length, 10);
    assert.match(html, /beda-spa-cucumber/);
    assert.match(html, /beda-spa-mat/);
    assert.equal((html.match(/class="beda-spa-dot is-on"/g) ?? []).length, 5);
    assert.equal((html.match(/class="beda-spa-dot"/g) ?? []).length, 3);
    assert.match(html, /Ẩn bạn này/);
    assert.match(html, /Vẫy tay/);
    assert.match(html, /Thả tim/);
    assert.match(html, /Khen đồ/);
    assert.match(html, /https:\/\/zalo\.me\/share\?url=https%3A%2F%2Fdadiary\.vn%2Fbe-da%2Fphong%2FDA7K2M/);
    assert.equal(html.includes("textarea"), false);
    assert.equal(html.includes('data-testid="beda-coins"'), false);
    assert.equal(html.includes('data-testid="beda-streak"'), false);
    assert.equal(html.includes("ấm trà"), false);
    assertNoScores(html);
  });

  it("offers the next hall when this one is full", () => {
    const html = renderGame({
      tab: "lobby",
      hall: 1,
      hallCount: 28,
      hallCap: 28,
      hallFull: true,
      nextHall: 2,
    });
    assert.match(html, /Sảnh 1 · 28\/28 người/);
    assert.match(html, /Sảnh 1 đầy\?/);
    assert.match(html, /Sang Sảnh 2/);
    assert.match(html, /data-testid="beda-hall-switch"/);
    assert.equal(html.includes("access_token"), false);
  });

  it("hides the friend card when the lobby selection is cleared", () => {
    const html = renderGame({ tab: "lobby", selectedFriendId: "" });
    assert.match(html, /data-testid="beda-lobby"/);
    assert.equal(html.includes('data-testid="beda-actions"'), false);
    assert.match(html, /Kẹo Dẻo/);
    assertNoScores(html);
  });

  it("shows a neglected Bé Da as sleepy with zzz, centred, and no abandoned note", () => {
    const html = renderGame({
      player: gameRoomView(
        resolveBeDaView({
          snapshot: {
            ...defaultSnapshot(),
            isDefault: false,
            mood: "waiting_door_sign",
            missedDays: 21,
            glowLevel: 2,
            glowProgress: 0.2,
            nearLevelUp: false,
          },
          missedDays: 21,
          sessionHappy: false,
          locale: "vi",
        }),
      ),
      showPrettyLine: false,
      progress: 0.2,
    });
    assert.match(html, /\/mascot\/faces\/sleepy\/mouth\.svg/);
    assert.match(html, /\/mascot\/props\/zzz\.svg/);
    assert.match(html, /\/mascot\/messy\/1\.svg/);
    assert.match(html, /\/mascot\/body\/body_chibi\.svg/);
    assert.equal(html.includes("waiting_door"), false);
    assert.equal(html.includes("flies"), false);
    assert.equal(html.includes("body_sit"), false);
    assert.equal(html.includes("/mascot/props/door.svg"), false);
    assert.equal(html.includes("sign_"), false);
    assert.equal(html.includes("/mascot/props/pillow.svg"), false);
    assert.equal(html.includes("/mascot/props/suitcase.svg"), false);
    assert.equal(html.includes("/mascot/props/pot.svg"), false);
    assert.equal(html.includes("/mascot/props/room_"), false);
    assert.equal(html.includes("Tôi đã bị bỏ rơi ở đây"), false);
    assert.match(html, /Ra Sảnh/);
    assert.match(html, /data-testid="beda-cabinet"/);
    assert.match(html, /aria-label="Tủ đồ"/);
    assert.match(html, /\/mascot\/props\/wardrobe\.svg/);
    assert.match(html, /\/mascot\/props\/sink\.svg/);
    assert.match(html, /beda-bed-head/);
    assert.match(html, /beda-bed-mattress/);
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
