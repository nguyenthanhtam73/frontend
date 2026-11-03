import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_MASCOT_IDS } from "./catalog";
import { accessoryUnlocked, clampGlowLevel, parseGlowProgress } from "./glow";
import { glowLayerSrc, mascotStack } from "./layers";
import { defaultSnapshot, parseMascot, resolveBeDaView, type BeDaView } from "./model";

function viewFrom(payload: Record<string, unknown>): BeDaView {
  const snapshot = parseMascot(payload);
  return resolveBeDaView({
    snapshot,
    missedDays: 0,
    sessionHappy: false,
    locale: "vi",
  });
}

function happy(level: number, extra: Record<string, unknown> = {}): BeDaView {
  return viewFrom({
    mood: "happy",
    missed_days: 0,
    glow_level: level,
    glow_progress: 0.4,
    loadout: {
      body: "body_chibi",
      hair: "hair_sleep_buns",
      outfit: "outfit_cozy_pajamas",
      room_items: ["room_moon"],
    },
    skin_marks: [{ concern: "acne", level: "light" }],
    ...extra,
  });
}

describe("glow progress", () => {
  it("reads glow_progress, points, and near_level_up without inventing a fill", () => {
    const snap = parseMascot({
      glow_level: 4,
      glow_points: 40,
      next_level_points: 70,
      glow_progress: 0.62,
      progress: 0.1,
      near_level_up: true,
      level_up: false,
    });
    assert.equal(snap.glowLevel, 4);
    assert.equal(snap.glowPoints, 40);
    assert.equal(snap.nextLevelPoints, 70);
    assert.equal(snap.glowProgress, 0.62);
    assert.equal(snap.nearLevelUp, true);
    assert.equal(snap.levelUp, false);
    const view = resolveBeDaView({
      snapshot: snap,
      missedDays: 0,
      sessionHappy: false,
      locale: "vi",
    });
    assert.equal(view.glowProgress, 0.62);
    assert.equal(view.nearLevelUp, true);
    assert.equal("glowPoints" in view, false);
    assert.equal("nextLevelPoints" in view, false);

    const top = parseMascot({
      glow_level: 6,
      glow_points: 200,
      next_level_points: null,
      glow_progress: 1,
      near_level_up: false,
      level_up: true,
    });
    assert.equal(top.glowLevel, 6);
    assert.equal(top.nextLevelPoints, null);
    assert.equal(top.glowProgress, 1);
    assert.equal(top.levelUp, true);

    assert.equal(parseGlowProgress(1.4), 1);
    assert.equal(parseGlowProgress(-0.2), 0);
    assert.equal(parseGlowProgress("nope"), null);
    assert.equal(clampGlowLevel(undefined), 1);
    assert.equal(clampGlowLevel(6), 6);
  });

  it("hides the bar when glow_progress is missing and ignores removed day fields", () => {
    const snap = parseMascot({
      mood: "happy",
      checkin_days: 12,
      next_level_at: 28,
      progress: 0.9,
    });
    assert.equal(snap.glowLevel, 1);
    assert.equal(snap.glowProgress, null);
    assert.equal(snap.nearLevelUp, false);
    assert.equal(snap.glowPoints, null);
    assert.equal(snap.nextLevelPoints, null);
    assert.equal(snap.levelUp, false);
  });
});

const CHECKIN_MARKS = [
  { concern: "acne", level: "light" },
  { concern: "oily", level: "medium" },
  { concern: "dark_spot", level: "heavy" },
  { id: "dry", level: "light" },
  { concern: "red", level: "medium" },
];

describe("glow layers", () => {
  it("stacks back, face, and front glow around the body for any level", () => {
    for (const level of [1, 4, 6]) {
      const stack = mascotStack(happy(level));
      const back = stack.findIndex((layer) => layer.slot === "glow-back");
      const room = stack.findIndex((layer) => layer.slot === "props-room");
      const body = stack.findIndex((layer) => layer.slot === "body");
      const cheeks = stack.findIndex((layer) => layer.slot === "face-cheeks");
      const glow = stack.findIndex((layer) => layer.slot === "glow");
      const marks = stack.findIndex((layer) => layer.slot === "skin-marks");
      const mouth = stack.findIndex((layer) => layer.slot === "face-mouth");
      const front = stack.findIndex((layer) => layer.slot === "glow-front");
      const lids = stack.findIndex((layer) => layer.slot === "fx-eyelids");
      assert.equal(back, 0);
      assert.ok(back < room && room < body);
      assert.ok(cheeks < glow && glow < marks);
      assert.ok(mouth < front && front < lids);
      assert.equal(stack[back]?.src, glowLayerSrc(level, "back"));
      assert.equal(stack[glow]?.src, glowLayerSrc(level, "mid"));
      assert.equal(stack[front]?.src, glowLayerSrc(level, "front"));
    }
  });

  it("keeps every latest skin mark above glow/level_N at every glow level", () => {
    const markSrcs = [
      "/mascot/skin_marks/acne_light.svg",
      "/mascot/skin_marks/oily_medium.svg",
      "/mascot/skin_marks/dark_spot_heavy.svg",
      "/mascot/skin_marks/dry_light.svg",
      "/mascot/skin_marks/red_medium.svg",
    ];
    let first: string[] | null = null;
    for (const level of [1, 2, 3, 4, 5, 6]) {
      const view = happy(level, {
        skin_marks: CHECKIN_MARKS,
        glow_points: 12,
        next_level_points: 40,
        glow_progress: 0.3,
        near_level_up: level === 5,
      });
      const stack = mascotStack(view);
      const drawn = stack.filter((layer) => layer.slot === "skin-marks").map((layer) => layer.src);
      assert.deepEqual(drawn, markSrcs);
      const glowAt = stack.findIndex((layer) => layer.slot === "glow");
      const firstMark = stack.findIndex((layer) => layer.slot === "skin-marks");
      assert.ok(glowAt >= 0 && firstMark === glowAt + 1, `level ${level}: marks follow glow/level_${level}`);
      assert.equal(stack[glowAt]?.src, `/mascot/glow/level_${level}.svg`);
      const front = stack.findIndex((layer) => layer.slot === "glow-front");
      assert.ok(front > firstMark);
      first ??= drawn;
      assert.deepEqual(drawn, first);
    }
  });

  it("draws only the back and front glow when Bé Da is turned around", () => {
    const view = resolveBeDaView({
      snapshot: {
        ...defaultSnapshot(),
        mood: "back_turned",
        missedDays: 0,
        isDefault: false,
        glowLevel: 6,
      },
      missedDays: 0,
      sessionHappy: false,
      locale: "vi",
    });
    const stack = mascotStack(view);
    assert.equal(view.mood, "back_turned");
    assert.equal(stack.some((layer) => layer.slot === "glow"), false);
    assert.equal(stack.some((layer) => layer.slot.startsWith("face-")), false);
    assert.equal(stack[0]?.src, glowLayerSrc(6, "back"));
    assert.ok(stack.some((layer) => layer.src === glowLayerSrc(6, "front")));
    const front = stack.findIndex((layer) => layer.slot === "glow-front");
    const body = stack.findIndex((layer) => layer.slot === "body");
    assert.ok(front > body);
  });
});

describe("glow accessory unlock", () => {
  it("hides the headband below level 3 and the star clip below level 4", () => {
    assert.equal(accessoryUnlocked(DEFAULT_MASCOT_IDS.headband, 2), false);
    assert.equal(accessoryUnlocked(DEFAULT_MASCOT_IDS.headband, 3), true);
    assert.equal(accessoryUnlocked(DEFAULT_MASCOT_IDS.accessory, 3), false);
    assert.equal(accessoryUnlocked(DEFAULT_MASCOT_IDS.accessory, 4), true);
    assert.equal(accessoryUnlocked("accessory_future_bow", 1), true);

    const low = mascotStack(happy(1));
    assert.equal(low.some((layer) => layer.slot === "accessory-headband"), false);
    assert.equal(low.some((layer) => layer.slot === "accessory"), false);

    const band = mascotStack(happy(3));
    assert.ok(band.some((layer) => layer.src.endsWith("/accessory_pink_headband.svg")));
    assert.equal(band.some((layer) => layer.src.endsWith("/accessory_star_clip.svg")), false);

    const both = mascotStack(happy(4));
    const bandAt = both.findIndex((layer) => layer.slot === "accessory-headband");
    const cheeks = both.findIndex((layer) => layer.slot === "face-cheeks");
    const clipAt = both.findIndex((layer) => layer.slot === "accessory");
    const mouth = both.findIndex((layer) => layer.slot === "face-mouth");
    const front = both.findIndex((layer) => layer.slot === "glow-front");
    assert.ok(bandAt > 0 && bandAt < cheeks);
    assert.ok(mouth < clipAt && clipAt < front);
  });

  it("shows shop-owned pieces below the unlock level", () => {
    assert.equal(accessoryUnlocked(DEFAULT_MASCOT_IDS.headband, 1, true), true);
    assert.equal(accessoryUnlocked(DEFAULT_MASCOT_IDS.accessory, 1, true), true);

    const owned = mascotStack(
      viewFrom({
        glow_level: 1,
        glow_progress: 0.2,
        loadout: {
          accessories: [
            { id: "accessory_pink_headband", source: "shop" },
            { id: "accessory_star_clip", source: "free" },
          ],
        },
      }),
    );
    assert.ok(owned.some((layer) => layer.src.endsWith("/accessory_pink_headband.svg")));
    assert.equal(owned.some((layer) => layer.src.endsWith("/accessory_star_clip.svg")), false);

    const listed = mascotStack(
      viewFrom({
        glow_level: 1,
        loadout: { accessories: ["accessory_star_clip"] },
      }),
    );
    assert.ok(listed.some((layer) => layer.src.endsWith("/accessory_star_clip.svg")));
    assert.equal(listed.some((layer) => layer.src.endsWith("/accessory_pink_headband.svg")), false);
  });

  it("defaults a payload with no glow fields to level 1 and locks the free pair", () => {
    const snap = parseMascot({ mood: "happy", loadout: { accessory: "accessory_star_clip" } });
    assert.equal(snap.glowLevel, 1);
    assert.equal(snap.levelUp, false);
    assert.equal(snap.glowProgress, null);
    const stack = mascotStack(
      resolveBeDaView({ snapshot: snap, missedDays: 0, sessionHappy: false, locale: "vi" }),
    );
    assert.equal(stack.some((layer) => layer.slot === "accessory-headband"), false);
    assert.equal(stack.some((layer) => layer.slot === "accessory"), false);
    assert.equal(stack[0]?.src, glowLayerSrc(1, "back"));
  });
});
