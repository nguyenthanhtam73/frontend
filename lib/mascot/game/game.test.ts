import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { formatGameCoins, gameCoinCount, countRoutineTicks } from "./coins";
import { mascotStack } from "@/lib/mascot/layers";
import {
  DEFAULT_GAME_LOOK,
  GAME_LOOK_KEY,
  GAME_OUTFITS,
  readGameLook,
  writeGameLook,
  type GameLook,
} from "./look";
import { SAMPLE_LOBBY_FRIENDS, lobbyHeadCount, sampleFriendView } from "./lobby";
import { isBeDaGamePath, localePath } from "./path";
import {
  GAME_CHEST_KEY,
  GAME_SOUND_KEY,
  GAME_WAVE_KEY,
  readDayFlag,
  readSoundEnabled,
  writeDayFlag,
  writeSoundEnabled,
} from "./prefs";
import {
  chestHearts,
  chestReady,
  checkedInOnDay,
  gameBubbleKind,
  gameQuests,
} from "./quests";
import { skyPeriodFromHour } from "./sky";

function memory(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => (data.has(key) ? data.get(key)! : null),
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => data.delete(key),
    setItem: (key, value) => data.set(key, String(value)),
  };
}

describe("game sky", () => {
  it("shifts through the day without a night gap in the afternoon", () => {
    assert.equal(skyPeriodFromHour(0), "night");
    assert.equal(skyPeriodFromHour(4), "night");
    assert.equal(skyPeriodFromHour(5), "dawn");
    assert.equal(skyPeriodFromHour(6), "dawn");
    assert.equal(skyPeriodFromHour(7), "morning");
    assert.equal(skyPeriodFromHour(10), "morning");
    assert.equal(skyPeriodFromHour(11), "afternoon");
    assert.equal(skyPeriodFromHour(15), "afternoon");
    assert.equal(skyPeriodFromHour(16), "evening");
    assert.equal(skyPeriodFromHour(18), "evening");
    assert.equal(skyPeriodFromHour(19), "night");
    assert.equal(skyPeriodFromHour(23), "night");
  });
});

describe("game coins", () => {
  it("uses glow points as xu and never goes below zero", () => {
    assert.equal(gameCoinCount({ glowPoints: 1250, routineTicks: 1, checkedInToday: false }), 1250);
    assert.equal(gameCoinCount({ glowPoints: 0, routineTicks: 9, checkedInToday: true }), 0);
    assert.equal(gameCoinCount({ glowPoints: -4, routineTicks: 2, checkedInToday: true }), 0);
  });

  it("falls back to today's ticks and check-in only when points were omitted", () => {
    assert.equal(gameCoinCount({ glowPoints: null, routineTicks: 3, checkedInToday: true }), 50);
    assert.equal(gameCoinCount({ glowPoints: null, routineTicks: 0, checkedInToday: false }), 0);
    assert.equal(
      countRoutineTicks(
        [{ completed: true }, { completed: false }],
        [{ completed: true }],
        { amDone: 0, pmDone: 0 },
      ),
      2,
    );
    assert.equal(countRoutineTicks([], [], { amDone: 1, pmDone: 2 }), 3);
  });

  it("formats xu for Vietnamese grouping and English grouping", () => {
    assert.equal(formatGameCoins(1250, "vi"), "1.250");
    assert.equal(formatGameCoins(1250, "en"), "1,250");
  });
});

describe("game quests and chest", () => {
  const morning = [
    { category: "cleanser", title: "Sữa rửa mặt", completed: true },
    { category: "moisturizer", title: "Kem dưỡng", completed: false },
    { category: "spf", title: "Kem chống nắng", completed: false },
  ];

  it("reads wash and sunscreen from routine ticks", () => {
    const open = gameQuests({ morning, routineToday: null, wavedToday: false });
    assert.deepEqual(
      open.map((quest) => [quest.id, quest.done]),
      [
        ["wash", true],
        ["spf", false],
        ["wave", false],
      ],
    );
    assert.equal(gameBubbleKind(open), "washed");

    const spfOn = gameQuests({
      morning: morning.map((step) => (step.category === "spf" ? { ...step, completed: true } : step)),
      routineToday: null,
      wavedToday: false,
    });
    assert.equal(gameBubbleKind(spfOn), "wave");
    assert.equal(chestReady(spfOn, false), false);

    const done = gameQuests({
      morning: morning.map((step) => ({ ...step, completed: true })),
      routineToday: null,
      wavedToday: true,
    });
    assert.equal(gameBubbleKind(done), "done");
    assert.equal(chestReady(done, false), true);
    assert.equal(chestReady(done, true), false);
    assert.equal(chestHearts(done), 3);
  });

  it("uses mascot routine counts when the step list is missing", () => {
    const fromCounts = gameQuests({
      morning: [],
      routineToday: { amDone: 3, amTotal: 3, pmDone: 0, pmTotal: 2 },
      wavedToday: true,
    });
    assert.equal(fromCounts.every((quest) => quest.done), true);
    const untouched = gameQuests({
      morning: [],
      routineToday: { amDone: 0, amTotal: 3, pmDone: 1, pmTotal: 2 },
      wavedToday: false,
    });
    assert.equal(untouched.find((quest) => quest.id === "wash")?.done, false);
    assert.equal(untouched.find((quest) => quest.id === "spf")?.done, false);
  });

  it("treats a check-in on today's Vietnam date as checked in", () => {
    assert.equal(checkedInOnDay("2026-11-03", "2026-11-03"), true);
    assert.equal(checkedInOnDay("2026-11-02", "2026-11-03"), false);
    assert.equal(checkedInOnDay("2026-11-03T02:30:00Z", "2026-11-03"), true);
    assert.equal(checkedInOnDay(null, "2026-11-03"), false);
  });
});

describe("game sound and day flags", () => {
  it("keeps a saved mute choice and defaults to sound on", () => {
    const store = memory();
    assert.equal(readSoundEnabled(store), true);
    writeSoundEnabled(store, false);
    assert.equal(store.getItem(GAME_SOUND_KEY), "off");
    assert.equal(readSoundEnabled(store), false);
    writeSoundEnabled(store, true);
    assert.equal(readSoundEnabled(store), true);
  });

  it("remembers the wave and the claimed chest for one day", () => {
    const store = memory();
    assert.equal(readDayFlag(store, GAME_WAVE_KEY, "2026-11-03"), false);
    writeDayFlag(store, GAME_WAVE_KEY, "2026-11-03");
    writeDayFlag(store, GAME_CHEST_KEY, "2026-11-03");
    assert.equal(readDayFlag(store, GAME_WAVE_KEY, "2026-11-03"), true);
    assert.equal(readDayFlag(store, GAME_WAVE_KEY, "2026-11-04"), false);
    assert.equal(readDayFlag(store, GAME_CHEST_KEY, "2026-11-03"), true);
  });
});

describe("sample lobby", () => {
  it("is nicknames only, marked sample, and counts the player toward 18", () => {
    assert.equal(SAMPLE_LOBBY_FRIENDS.length, 17);
    assert.equal(lobbyHeadCount(), 18);
    const ids = new Set<string>();
    for (const friend of SAMPLE_LOBBY_FRIENDS) {
      assert.equal(friend.sample, true);
      assert.equal(ids.has(friend.id), false);
      ids.add(friend.id);
      assert.equal(friend.nickname.includes("@"), false);
      assert.equal(/\d/.test(friend.nickname), false);
      assert.equal("photo" in friend, false);
      assert.equal("email" in friend, false);
      assert.equal("name" in friend, false);
      const view = sampleFriendView(friend);
      assert.equal(view.marks.length, 0);
      assert.equal(view.glowProgress, null);
      assert.equal(GAME_OUTFITS.includes(friend.outfit), true);
    }
    assert.equal(new Set(SAMPLE_LOBBY_FRIENDS.map((friend) => friend.outfit)).size, GAME_OUTFITS.length);
  });

  it("draws closet clothes in the layer order from LAYERS-NEW", () => {
    const friend = SAMPLE_LOBBY_FRIENDS[0]!;
    const stack = mascotStack(sampleFriendView(friend), {
      dress: {
        outfitId: "outfit_ao_dai",
        hairId: "hair_high_pony",
        clipId: "accessory_ribbon_bow",
        pose: "cheer",
      },
    });
    const at = (slot: string) => stack.findIndex((layer) => layer.slot === slot);
    assert.ok(at("outfit") < at("arms"));
    assert.ok(at("arms") < at("hair"));
    assert.ok(at("hair") < at("accessory-clip"));
    assert.ok(at("accessory-clip") < at("face-cheeks"));
    assert.equal(stack.find((layer) => layer.slot === "outfit")?.src, "/mascot/outfits/outfit_ao_dai.svg");
    assert.equal(stack.find((layer) => layer.slot === "arms")?.src, "/mascot/outfits/arms_up__ao_dai.svg");
    assert.equal(stack.find((layer) => layer.slot === "hair")?.src, "/mascot/hair/hair_high_pony.svg");
    assert.equal(
      stack.find((layer) => layer.slot === "accessory-clip")?.src,
      "/mascot/accessory/accessory_ribbon_bow.svg",
    );
    const plain = mascotStack(sampleFriendView(friend));
    assert.equal(plain.find((layer) => layer.slot === "outfit")?.src, "/mascot/outfit/outfit_cozy_pajamas.svg");
    assert.equal(plain.some((layer) => layer.slot === "arms"), false);
  });
});

describe("game closet", () => {
  it("remembers a valid look and drops a broken one", () => {
    const store = memory();
    assert.equal(readGameLook(store), null);
    const look: GameLook = {
      outfit: "outfit_hoodie",
      hair: "hair_short_bob",
      clip: "accessory_flower_clip",
    };
    writeGameLook(store, look);
    assert.equal(store.getItem(GAME_LOOK_KEY)?.includes("outfit_hoodie"), true);
    assert.deepEqual(readGameLook(store), look);
    writeGameLook(store, { ...DEFAULT_GAME_LOOK, clip: null });
    assert.equal(readGameLook(store)?.clip, null);
    store.setItem(GAME_LOOK_KEY, "{");
    assert.equal(readGameLook(store), null);
    store.setItem(GAME_LOOK_KEY, JSON.stringify({ outfit: "outfit_nope", hair: "hair_sleep_buns", clip: null }));
    assert.equal(readGameLook(store), null);
  });
});

describe("game path", () => {
  it("matches the trial route in both locales", () => {
    assert.equal(isBeDaGamePath("/be-da"), true);
    assert.equal(isBeDaGamePath("/en/be-da"), true);
    assert.equal(isBeDaGamePath("/be-da/"), true);
    assert.equal(isBeDaGamePath("/routine"), false);
    assert.equal(localePath("vi", "/routine"), "/routine");
    assert.equal(localePath("en", "/check-in"), "/en/check-in");
  });
});

describe("game layout", () => {
  it("keeps Bé Da centered and large on a tablet, and the lobby wider than the screen", () => {
    const css = fs.readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../components/mascot/game/be-da-game.css"),
      "utf8",
    );
    assert.match(css, /\.beda-hero-wrap\s*\{[^}]*left:\s*50%/);
    assert.match(css, /\.beda-hero-wrap\s*\{[^}]*transform:\s*translateX\(-50%\)/);
    assert.match(css, /min-width:\s*768px[\s\S]*\.beda-hero-wrap\s*\{[^}]*clamp\(340px,\s*48vmin,\s*520px\)/);
    assert.match(css, /\.beda-lobby-world\s*\{[^}]*width:\s*260%/);
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
    assert.equal(css.includes("w-[148px]"), false);
  });
});
