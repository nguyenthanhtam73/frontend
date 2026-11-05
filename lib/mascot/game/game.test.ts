import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { formatGameCoins, gameCoinCount, countRoutineTicks } from "./coins";
import { mascotStack } from "@/lib/mascot/layers";
import { defaultSnapshot, resolveBeDaView } from "@/lib/mascot/model";
import { gameRoomView } from "./room-view";
import {
  DEFAULT_GAME_LOOK,
  GAME_LOOK_KEY,
  GAME_OUTFITS,
  readGameLook,
  writeGameLook,
  type GameLook,
} from "./look";
import {
  LOBBY_FIGURE_GAP,
  LOBBY_PLAYER_SPOT,
  LOBBY_SAMPLE_CAP,
  LOBBY_SAMPLE_CELLS,
  LOBBY_SOLVE_MAX_PROBES,
  LOBBY_WORLD,
  SAMPLE_LOBBY_FRIENDS,
  clampLobbyPoint,
  lobbyFigureBox,
  lobbyFigureHitsChrome,
  lobbyHeadCount,
  nudgeLobbyLabels,
  lobbyShownSamples,
  lobbySpawn,
  solveLobbyCells,
  lobbyBodyBox,
  lobbyTooClose,
  screenBoxesOverlap,
  tagEdgeDelta,
  lobbyStackZ,
  lobbyTagNudgePx,
  placeFriendCard,
  sampleFriendView,
} from "./lobby";
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
  it("is nicknames only, marked sample, and fills the hall of 28 with the player", () => {
    assert.equal(SAMPLE_LOBBY_FRIENDS.length, 27);
    assert.equal(lobbyHeadCount(), 28);
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

  it("keeps lobby visitors happy, with a shadow and no stickers", () => {
    const sleepy = SAMPLE_LOBBY_FRIENDS.find((friend) => friend.mood === "sleepy");
    assert.ok(sleepy);
    const stack = mascotStack(sampleFriendView(sleepy), { crowd: true, locale: "vi" });
    const srcs = stack.map((layer) => layer.src).join(" ");
    assert.match(srcs, /\/mascot\/faces\/happy\/eyes\.svg/);
    assert.match(srcs, /\/mascot\/faces\/happy\/mouth\.svg/);
    assert.match(srcs, /\/mascot\/body\/body_chibi\.svg/);
    assert.equal(srcs.includes("faces/sleepy"), false);
    assert.equal(srcs.includes("zzz"), false);
    assert.equal(srcs.includes("sparkles"), false);
    assert.equal(srcs.includes("room_"), false);
    assert.equal(srcs.includes("accessory_star_clip"), false);
    assert.equal(srcs.includes("/mascot/glow/"), false);
    assert.equal(stack.some((layer) => layer.slot === "fx-eyelids"), false);
    const home = mascotStack(sampleFriendView(sleepy), { locale: "vi" });
    assert.equal(home.some((layer) => layer.src.includes("zzz")), true);
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
    assert.equal(isBeDaGamePath("/be-da/phong/DA7K2M"), true);
    assert.equal(isBeDaGamePath("/en/be-da/phong/DA7K2M"), true);
    assert.equal(isBeDaGamePath("/routine"), false);
    assert.equal(localePath("vi", "/routine"), "/routine");
    assert.equal(localePath("en", "/check-in"), "/en/check-in");
  });
});

describe("lobby world", () => {
  const spots = [
    ...SAMPLE_LOBBY_FRIENDS.map((friend) => ({ id: friend.id, x: friend.x, y: friend.y })),
    { id: "you", x: LOBBY_PLAYER_SPOT.x, y: LOBBY_PLAYER_SPOT.y },
  ];

  it("matches the Android 1000×3000 world and walkable floor", () => {
    assert.equal(LOBBY_WORLD.width, 1000);
    assert.equal(LOBBY_WORLD.height, 3000);
    assert.equal(LOBBY_WORLD.height / LOBBY_WORLD.width, 3);
    assert.equal(LOBBY_WORLD.viewportWidthScale, 1.3);
    assert.deepEqual(LOBBY_WORLD.walk, { minX: 0.06, maxX: 0.94, minY: 0.12, maxY: 0.96 });
    assert.deepEqual(LOBBY_WORLD.spawn, { x: 0.5, y: 0.55, dx: 0.08, dy: 0.05 });
    assert.deepEqual(clampLobbyPoint(0, 0), { x: 0.06, y: 0.12 });
    assert.deepEqual(clampLobbyPoint(2, 2), { x: 0.94, y: 0.96 });
    const rolls = [0, 1, 0.25, 0.75];
    let i = 0;
    const spawned = lobbySpawn(() => rolls[i++] ?? 0);
    assert.ok(spawned.x >= 0.5 - 0.08 && spawned.x <= 0.5 + 0.08);
    assert.ok(spawned.y >= 0.55 - 0.05 && spawned.y <= 0.55 + 0.05);
  });

  it("spreads sample friends across the whole floor", () => {
    const { walk } = LOBBY_WORLD;
    const xs = SAMPLE_LOBBY_FRIENDS.map((friend) => friend.x);
    const ys = SAMPLE_LOBBY_FRIENDS.map((friend) => friend.y);
    for (const friend of SAMPLE_LOBBY_FRIENDS) {
      assert.ok(friend.x >= walk.minX && friend.x <= walk.maxX, friend.id);
      assert.ok(friend.y >= walk.minY && friend.y <= walk.maxY, friend.id);
    }
    assert.ok(Math.min(...xs) < 0.15);
    assert.ok(Math.max(...xs) > 0.85);
    assert.ok(Math.min(...xs) < 0.2);
    assert.ok(Math.max(...xs) > 0.8);
    assert.ok(Math.min(...ys) < 0.2);
    assert.ok(Math.max(...ys) > 0.9);
    const worldW = 390 * 1.3;
    const worldH = worldW * 3;
    const { spawn } = LOBBY_WORLD;
    let near = 0;
    for (let i = 0; i < SAMPLE_LOBBY_FRIENDS.length; i += 1) {
      const a = SAMPLE_LOBBY_FRIENDS[i]!;
      if (Math.abs(a.x - spawn.x) <= 0.14 && Math.abs(a.y - spawn.y) <= 0.12) near += 1;
      for (let j = i + 1; j < SAMPLE_LOBBY_FRIENDS.length; j += 1) {
        const b = SAMPLE_LOBBY_FRIENDS[j]!;
        assert.equal(
          screenBoxesOverlap(
            lobbyBodyBox(a.x, a.y, a.nickname, worldW, worldH),
            lobbyBodyBox(b.x, b.y, b.nickname, worldW, worldH),
            0,
          ),
          false,
          `${a.id} ${b.id}`,
        );
      }
    }
    assert.ok(near <= 3, `near spawn ${near}`);
  });

  it("draws a short sample cast on cells that stay apart at 390px", () => {
    const shown = lobbyShownSamples();
    assert.equal(shown.length, LOBBY_SAMPLE_CAP);
    assert.equal(LOBBY_SAMPLE_CAP, 6);
    assert.ok(shown.some((friend) => friend.id === "keo-deo"));
    assert.ok(shown.some((friend) => friend.id === "meo-may"));
    const worldW = 390 * 1.3;
    const worldH = worldW * 3;
    const floor = LOBBY_SAMPLE_CELLS.filter((cell) => cell.y >= LOBBY_WORLD.walk.minY);
    assert.equal(floor.length, 12);
    for (let i = 0; i < shown.length; i += 1) {
      const a = shown[i]!;
      assert.equal(lobbyFigureHitsChrome(a.x, a.y, a.nickname), false, a.id);
      for (let j = i + 1; j < shown.length; j += 1) {
        const b = shown[j]!;
        assert.equal(
          screenBoxesOverlap(
            lobbyFigureBox(a.x, a.y, a.nickname, worldW, worldH),
            lobbyFigureBox(b.x, b.y, b.nickname, worldW, worldH),
            LOBBY_FIGURE_GAP,
          ),
          false,
          `${a.id} ${b.id}`,
        );
      }
    }
    const spot = lobbySpawn(() => 0.5);
    const parked = solveLobbyCells({
      samples: shown.map((friend) => ({
        id: friend.id,
        nickname: friend.nickname,
        homeX: friend.x,
        homeY: friend.y,
        cell: LOBBY_SAMPLE_CELLS.findIndex((cell) => cell.x === friend.x && cell.y === friend.y),
      })),
      player: { x: 0.5, y: 0.55, nickname: "Bé Da" },
      lives: [],
      cam: { x: 0, y: -5000, scale: 1 },
      viewW: 390,
      viewH: 844,
      worldW,
      worldH,
    });
    assert.equal(parked.probes, shown.length);
    assert.equal(
      parked.seats.every((seat, index) => {
        const home = shown[index]!;
        return !seat.hidden && seat.cell === LOBBY_SAMPLE_CELLS.findIndex((cell) => cell.x === home.x && cell.y === home.y);
      }),
      true,
    );
    const cold = solveLobbyCells({
      samples: Array.from({ length: 20 }, (_, index) => ({
        id: `extra-${index}`,
        nickname: "Mây Hồng",
        homeX: 0.5,
        homeY: 0.5,
        cell: -1,
      })),
      player: { x: 0.5, y: 0.55, nickname: "Bé Da" },
      lives: [],
      cam: { x: 0, y: 0, scale: 1 },
      viewW: 390,
      viewH: 844,
      worldW,
      worldH,
    });
    assert.equal(cold.probes, LOBBY_SOLVE_MAX_PROBES);
    const home = shown[0]!;
    const cell = LOBBY_SAMPLE_CELLS.findIndex((spot) => spot.x === home.x && spot.y === home.y);
    const stayed = solveLobbyCells({
      samples: [{ id: home.id, nickname: home.nickname, homeX: home.x, homeY: home.y, cell }],
      player: { x: home.x, y: home.y, nickname: "Bé Da" },
      lives: [{ x: home.x, y: home.y, nickname: "Khách" }],
      cam: { x: 0, y: -5000, scale: 1 },
      viewW: 390,
      viewH: 844,
      worldW,
      worldH,
    });
    assert.equal(stayed.seats[0]?.x, home.x);
    assert.equal(stayed.seats[0]?.y, home.y);
    const labels = nudgeLobbyLabels([
      { id: "a", left: 0, top: 0, right: 40, bottom: 16 },
      { id: "b", left: 10, top: 20, right: 50, bottom: 36 },
    ]);
    assert.equal(labels.every((label) => Math.abs(label.nudge) <= 16), true);
    assert.equal(lobbyFigureHitsChrome(spot.x, spot.y, "Bé Da 0000", 1.2), false);
    for (const friend of shown) {
      assert.equal(
        screenBoxesOverlap(
          lobbyFigureBox(spot.x, spot.y, "Bé Da 0000", worldW, worldH, 1.2),
          lobbyFigureBox(friend.x, friend.y, friend.nickname, worldW, worldH),
          LOBBY_FIGURE_GAP,
        ),
        false,
        friend.id,
      );
    }
  });

  it("keeps a name tag inside the screen by the smallest shift", () => {
    assert.equal(tagEdgeDelta({ left: 20, right: 90 }, { left: 0, right: 390 }), 0);
    assert.equal(tagEdgeDelta({ left: 340, right: 410 }, { left: 0, right: 390 }), -28);
    assert.equal(tagEdgeDelta({ left: -12, right: 70 }, { left: 0, right: 390 }), 20);
    const wide = tagEdgeDelta({ left: -30, right: 420 }, { left: 0, right: 390 });
    assert.equal(-30 + wide, 8);
  });

  it("spawns away from someone already standing in the arrival box", () => {
    const taken = { x: 0.42, y: 0.6 };
    const rolls = [0, 1, 0.5, 0.5];
    let i = 0;
    const spot = lobbySpawn(() => rolls[i++] ?? 0.5, [taken]);
    assert.equal(lobbyTooClose(spot, taken), false);
    assert.ok(spot.x >= 0.5 - 0.08 && spot.x <= 0.5 + 0.08);
    assert.ok(spot.y >= 0.55 - 0.05 && spot.y <= 0.55 + 0.05);
  });

  it("stacks by y and nudges tags away from the Bé Da in front", () => {
    const ordered = [...spots].sort((a, b) => a.y - b.y);
    for (let i = 1; i < ordered.length; i++) {
      const prev = ordered[i - 1]!;
      const next = ordered[i]!;
      if (next.y === prev.y) assert.equal(lobbyStackZ(next.y), lobbyStackZ(prev.y));
      else assert.ok(lobbyStackZ(next.y) > lobbyStackZ(prev.y));
    }
    const keo = spots.find((spot) => spot.id === "keo-deo")!;
    assert.equal(Number.isFinite(lobbyTagNudgePx(keo, spots)), true);
  });

  it("clamps the friend card above the round nav", () => {
    const mid = placeFriendCard({
      frameWidth: 706,
      frameHeight: 1024,
      friendTop: 520,
      friendLeft: 300,
      friendWidth: 140,
      friendHeight: 180,
      cardWidth: 160,
      cardHeight: 108,
      navTop: 900,
    });
    assert.equal(mid.flipped, false);
    assert.equal(mid.top, 520 - 108 - 8);
    assert.ok(mid.top + 108 <= 520);
    assert.ok(mid.top + 108 <= 900 - 8);
    assert.ok(mid.left >= 8 && mid.left + 160 <= 706 - 8);

    const high = placeFriendCard({
      frameWidth: 844,
      frameHeight: 390,
      friendTop: 12,
      friendLeft: 400,
      friendWidth: 100,
      friendHeight: 130,
      cardWidth: 150,
      cardHeight: 100,
      navTop: 280,
    });
    assert.equal(high.flipped, true);
    assert.ok(high.top >= 12 + 130);
    assert.ok(high.top + 100 <= 280 - 8);

    const tight = placeFriendCard({
      frameWidth: 844,
      frameHeight: 390,
      friendTop: 20,
      friendLeft: 360,
      friendWidth: 140,
      friendHeight: 200,
      cardWidth: 150,
      cardHeight: 90,
      navTop: 260,
    });
    assert.equal(tight.flipped, true);
    assert.ok(tight.top + 90 <= 260 - 8);
    assert.ok(tight.top >= 20);
    assert.ok(tight.left >= 360 + 140 || tight.left + 150 <= 360);

    const edge = placeFriendCard({
      frameWidth: 360,
      frameHeight: 700,
      friendTop: 300,
      friendLeft: 300,
      friendWidth: 80,
      friendHeight: 100,
      cardWidth: 180,
      cardHeight: 90,
      navTop: 580,
    });
    assert.equal(edge.flipped, false);
    assert.ok(edge.left >= 8);
    assert.ok(edge.left + 180 <= 360 - 8);
    assert.ok(edge.top + 90 <= 580 - 8);

    const crowded = placeFriendCard({
      frameWidth: 390,
      frameHeight: 844,
      friendTop: 200,
      friendLeft: 250,
      friendWidth: 90,
      friendHeight: 120,
      cardWidth: 160,
      cardHeight: 110,
      navTop: 720,
      avoid: { left: 280, top: 62, right: 382, bottom: 180 },
    });
    assert.ok(crowded.left + 160 <= 280 - 8);
    assert.ok(crowded.left >= 8);
    assert.ok(crowded.top >= 8);
    assert.ok(crowded.top + 110 <= 720 - 8);
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
    assert.match(css, /\.beda-cabinet\s*\{[^}]*left:\s*22\.5%/);
    assert.match(css, /\.beda-cabinet\s*\{[^}]*bottom:\s*41\.6%/);
    assert.match(css, /\.beda-cabinet\s*\{[^}]*width:\s*12%/);
    assert.match(css, /\.beda-cabinet\s*\{[^}]*z-index:\s*2/);
    assert.match(css, /min-width:\s*768px[\s\S]*\.beda-hero-wrap\s*\{[^}]*clamp\(340px,\s*48vmin,\s*520px\)/);
    assert.match(css, /\.beda-lobby-world\s*\{[^}]*width:\s*130%/);
    assert.match(css, /\.beda-lobby-world\s*\{[^}]*aspect-ratio:\s*1000\s*\/\s*3000/);
    assert.match(css, /\.beda-lobby-sky\s*\{[^}]*left:\s*-60%/);
    assert.match(css, /\.beda-lobby-sky\s*\{[^}]*width:\s*220%/);
    assert.match(css, /\.beda-ground\s*\{[^}]*left:\s*-60%/);
    assert.match(css, /\.beda-ground\s*\{[^}]*right:\s*-70%/);
    assert.equal(/inset 28px 0 46px/.test(css), false);
    assert.match(css, /\.beda-actions\s*\{[^}]*width:\s*max-content/);
    assert.equal(/\.beda-actions\s*\{[^}]*\bright:\s*12px/.test(css), false);
    assert.match(css, /\.beda-hero-wrap\s*\{[^}]*var\(--beda-nav-reserve\)/);
    assert.match(css, /\.beda-sheet\s*\{[^}]*var\(--beda-nav-reserve\)/);
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
    assert.equal(css.includes("w-[148px]"), false);
  });
});

const HIDDEN_ROOM_PROPS = /door|sign_|flies|props\/pillow\.svg|pot\.svg|suitcase|mirror|body_sit|waiting_door|messy\/[234]|room_/;

function homeForMissed(missed: number) {
  return resolveBeDaView({
    snapshot: defaultSnapshot(),
    missedDays: missed,
    sessionHappy: false,
    locale: "vi",
  });
}

describe("game room view", () => {
  it("shows a neglected Bé Da as sleepy with zzz, and leaves the home stack alone", () => {
    for (const missed of [4, 10, 15, 18, 21, 40]) {
      const home = homeForMissed(missed);
      const srcs = mascotStack(gameRoomView(home), { locale: "vi" })
        .map((layer) => layer.src)
        .join(" ");
      assert.doesNotMatch(srcs, HIDDEN_ROOM_PROPS, String(missed));
      assert.match(srcs, /faces\/sleepy/, String(missed));
      assert.match(srcs, /\/mascot\/props\/zzz\.svg/, String(missed));
      assert.match(srcs, /\/mascot\/body\/body_chibi\.svg/, String(missed));
    }
    const homeDoor = mascotStack(homeForMissed(21), { locale: "vi" })
      .map((layer) => layer.src)
      .join(" ");
    assert.match(homeDoor, /\/mascot\/props\/door\.svg/);
    assert.match(homeDoor, /sign_abandoned/);
    assert.match(homeDoor, /faces\/waiting_door_sign/);
    assert.match(homeDoor, /\/fx\/flies\//);
    assert.match(homeDoor, /messy\/4/);
  });

  it("keeps a happy day happy, without zzz", () => {
    const happy = resolveBeDaView({
      snapshot: { ...defaultSnapshot(), isDefault: false, mood: "happy" },
      missedDays: 0,
      sessionHappy: false,
      locale: "vi",
    });
    const srcs = mascotStack(gameRoomView(happy), { locale: "vi" })
      .map((layer) => layer.src)
      .join(" ");
    assert.match(srcs, /faces\/happy/);
    assert.equal(srcs.includes("zzz"), false);
    assert.equal(srcs.includes("room_"), false);
    assert.equal(gameRoomView(happy).mood, "happy");
  });
});
