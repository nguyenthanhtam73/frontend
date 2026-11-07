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
    onLook: () => true,
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
    assert.match(html, /beda-hero-wrap is-floor/);
    assert.match(html, /data-floor="on"/);
    assert.match(html, /data-testid="beda-room-shadow"/);
    assert.match(html, /data-walk-mask="\/mascot\/room\/walk-mask\.png\?v=[0-9a-f]{10}"/);
    assert.match(html, /beda-hero-wrap/);
    assert.match(html, /data-testid="beda-pixi"/);
    assert.match(html, /data-scene="room"/);
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

  it("shows only the default closet item and falls back from a removed look", () => {
    const look: GameLook = {
      outfit: "outfit_ao_dai",
      hair: "hair_twin_tails",
      clip: "accessory_flower_clip",
    };
    const html = renderGame({ look, tab: "wardrobe" satisfies GameTab });
    assert.match(html, /data-testid="beda-wardrobe"/);
    assert.match(html, /data-testid="beda-wardrobe-close"/);
    assert.match(html, /data-testid="beda-wardrobe-grab"/);
    assert.match(html, /beda-sheet-grab/);
    assert.match(html, /data-testid="beda-wardrobe-backdrop"/);
    assert.match(html, /aria-label="Đóng"/);
    assert.match(html, /data-wardrobe-preview="on"/);
    assert.match(html, /data-floor="off"/);
    assert.equal(html.includes("beda-hero-wrap is-floor"), false);
    assert.match(html, /data-testid="beda-hero"[\s\S]*data-testid="be-da-figure"/);
    assert.match(html, /\/mascot\/outfits\/outfit_pajamas\.svg/);
    assert.equal(html.includes("/mascot/outfits/outfit_ao_dai.svg"), false);
    assert.equal(html.includes("/mascot/hair/hair_twin_tails.svg"), false);
    assert.equal(html.includes("/mascot/accessory/accessory_flower_clip.svg"), false);
    assert.equal(html.includes("Áo dài"), false);
    assert.equal(html.includes("Áo thử"), false);
    assert.equal(html.includes("outfit_ao_thu"), false);
    assert.equal(html.includes("Váy hoa"), false);
    assert.equal(html.includes("Kẹp hoa"), false);
    assert.equal(html.includes("Hoodie"), false);
    assert.match(html, /Đồ ngủ/);
    assert.match(html, /Không mua|không mua/);
    assert.equal(html.includes("hue-rotate"), false);
    assert.match(html, /aria-label="Đồ ngủ"[^>]*aria-pressed="true"/);
    assert.equal((html.match(/class="beda-pick is-on"|class="beda-pick"/g) ?? []).length, 1);
    assert.match(html, /data-testid="beda-wear"/);
    assert.match(html, />Mặc</);
    assert.equal(html.includes('data-testid="beda-wearing-badge"'), false);
    assert.equal(html.includes("disabled"), false);
    assert.match(html, /beda-pick-skel/);
    assert.match(html, /is-loading/);
    assert.equal(html.includes('loading="lazy"'), false);
    assertNoScores(html);
  });

  it("lists Áo thử only for an admin account", () => {
    const html = renderGame({ tab: "wardrobe" satisfies GameTab, closetAdmin: true });
    assert.match(html, /Áo thử/);
    assert.match(html, /\/mascot\/outfits\/outfit_ao_thu\.svg/);
    assert.match(html, /Đồ ngủ/);
    const plain = renderGame({ tab: "wardrobe" satisfies GameTab });
    assert.equal(plain.includes("Áo thử"), false);
  });

  it("shows the worn badge, disabled button, and success toast after Mặc", () => {
    const html = renderGame({
      tab: "wardrobe" satisfies GameTab,
      look: DEFAULT_GAME_LOOK,
      wornLook: DEFAULT_GAME_LOOK,
      toast: { kind: "worn", name: "outfit_pajamas" },
    });
    assert.match(html, /Bé Da đã mặc Đồ ngủ ✨/);
    assert.match(html, /data-testid="beda-wearing-badge"/);
    assert.match(html, /data-wearing="true"/);
    assert.match(html, /data-testid="beda-wear" disabled=""/);
    assert.match(html, /Đang mặc/);
    assert.match(html, /\/mascot\/outfits\/outfit_pajamas\.svg/);
    const failed = renderGame({
      tab: "wardrobe" satisfies GameTab,
      toast: { kind: "wear-failed", name: "" },
    });
    assert.match(failed, /Chưa mặc được, thử lại nha/);
    assert.match(failed, /data-testid="beda-wear"(?![^>]*disabled)/);
  });

  it("draws the wide lobby with sample nicknames only", () => {
    const html = renderGame({ tab: "lobby", friendCount: 28 });
    assert.match(html, /data-testid="beda-lobby"/);
    assert.match(html, /beda-lobby-world/);
    assert.match(html, /Kẹo Dẻo/);
    assert.match(html, /Mèo Máy/);
    assert.match(html, /beda-tag-me/);
    assert.match(visibleText(html), /Bạn/);
    assert.equal((html.match(/data-sample="true"/g) ?? []).length, 6);
    assert.equal(html.includes("@"), false);
    assert.match(html, /Sảnh 1 · 7\/28 người/);
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
    assert.match(html, /data-testid="beda-pixi"/);
    assert.match(html, /data-scene="lobby"/);
    assert.match(html, /data-engine="pixi"/);
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
    assert.equal(html.includes("Vào phòng"), false);
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
        daysLeft: 5,
      },
    });
    const text = visibleText(html);
    assert.match(html, /data-testid="beda-spa"/);
    assert.match(text, /Phòng bạn bè/);
    assert.match(text, /5\/8 người/);
    assert.match(text, /Còn 5\/8 ngày/);
    assert.match(text, /Mời bạn/);
    assert.equal(html.includes('data-testid="beda-spa-code"'), false);
    assert.equal(html.includes("DA7K2M"), false);
    assert.equal(html.includes("Mã mời vào phòng"), false);
    assert.equal(html.includes("Ra sảnh"), false);
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
    assert.equal(html.includes("beda-spa-cucumber"), false);
    assert.equal(html.includes("beda-spa-mat"), false);
    assert.match(html, /Ẩn bạn này/);
    assert.match(html, /Vẫy tay/);
    assert.match(html, /Thả tim/);
    assert.match(html, /Khen đồ/);
    assert.equal(html.includes("zalo.me"), false);
    assert.equal(html.includes("textarea"), false);
    assert.equal(html.includes('data-testid="beda-coins"'), false);
    assert.equal(html.includes('data-testid="beda-streak"'), false);
    assert.equal(html.includes("ấm trà"), false);
    assertNoScores(html);
  });

  it("keeps the invite code behind Mời bạn", () => {
    const html = renderGame({
      spa: {
        code: "DA7K2M",
        count: 5,
        cap: 8,
        guests: sampleSpaGuests(new Set()),
        notice: null,
        daysLeft: 5,
      },
      spaInviteOpen: true,
    });
    const text = visibleText(html);
    assert.match(html, /data-testid="beda-invite-card"/);
    assert.match(html, /data-testid="beda-invite-back"/);
    assert.match(text, /Mã mời vào phòng/);
    assert.match(text, /Sao chép/);
    assert.match(text, /Gửi qua Zalo/);
    assert.match(html, /data-testid="beda-spa-code"/);
    assert.match(text, /D/);
    assert.match(html, /https:\/\/zalo\.me\/share\?url=https%3A%2F%2Fdadiary\.vn%2Fbe-da%2Fphong%2FDA7K2M/);
  });

  it("says the person is already in one room and hides create, join, and find", () => {
    const html = renderGame({
      tab: "lobby",
      activeRoom: { code: "DA7K2M", name: "DA7K2M", endsAt: "2026-11-15T03:00:00.000Z" },
      myRooms: ["DA7K2M", "BE3N9Q"],
    });
    const text = visibleText(html);
    assert.match(
      text,
      /Bạn đang ở phòng DA7K2M\. Mỗi người chỉ ở 1 phòng thôi, phòng kết thúc ngày 15\/11\/2026 rồi bạn tạo hoặc vào phòng mới nhé\./,
    );
    assert.match(html, /data-testid="beda-current-room"/);
    assert.match(text, /Vào phòng này/);
    assert.equal(html.includes("Tạo phòng"), false);
    assert.equal(html.includes("Nhập mã"), false);
    assert.equal(html.includes("Tìm phòng"), false);
    assert.equal(html.includes('data-testid="beda-create-room"'), false);
    assert.equal(html.includes('data-testid="beda-enter-code"'), false);
    assert.equal(html.includes('data-testid="beda-reenter-room"'), false);
    const english = renderGame(
      {
        tab: "lobby",
        activeRoom: { code: "DA7K2M", name: "DA7K2M", endsAt: "2026-11-15T03:00:00.000Z" },
      },
      en,
      "en",
    );
    const englishText = visibleText(english);
    assert.match(englishText, /You are in room DA7K2M/);
    assert.match(englishText, /November 15, 2026/);
    assert.match(englishText, /Go to this room/);
    assert.equal(english.includes("Create a room"), false);
    assert.equal(english.includes("Enter a code"), false);
  });

  it("shows the English room header with days left", () => {
    const html = renderGame(
      {
        spa: {
          code: "DA7K2M",
          count: 5,
          cap: 8,
          guests: [],
          notice: null,
          daysLeft: 5,
          name: "Tea room",
        },
      },
      en,
      "en",
    );
    const text = visibleText(html);
    assert.match(text, /Tea room/);
    assert.match(text, /5\/8 people/);
    assert.match(text, /5\/8 days left/);
    assert.match(text, /Invite/);
  });

  it("offers Vào phòng for a room this account already has", () => {
    const html = renderGame({ tab: "lobby", myRooms: ["DA7K2M"] });
    assert.match(html, /data-testid="beda-reenter-room"/);
    assert.match(html, /Vào phòng DA7K2M/);
    assert.match(html, /Tạo phòng/);
  });

  it("shows the 3-room cap with a button for every room", () => {
    const html = renderGame({
      tab: "lobby",
      myRooms: ["DA7K2M", "BE3N9Q", "CU4P8R"],
      createProblem: "too-many",
    });
    assert.match(html, /Bạn đã có 3 phòng/);
    assert.match(html, /Vào phòng DA7K2M/);
    assert.match(html, /Vào phòng BE3N9Q/);
    assert.match(html, /Vào phòng CU4P8R/);
    assert.equal((html.match(/data-testid="beda-reenter-room"/g) ?? []).length, 3);
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
