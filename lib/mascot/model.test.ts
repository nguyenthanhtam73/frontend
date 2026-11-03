import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  concernBars,
  defaultSnapshot,
  disheveledLevel,
  expiredItemKeys,
  improvedConcerns,
  isSessionComplete,
  itemLook,
  markCount,
  markOpacity,
  missedDayMood,
  missedDaysFromLast,
  moodLayer,
  parseMascot,
  parseSkinMark,
  permanentItem,
  poseForStep,
  resolveBeDaView,
  showFlies,
  streakDotBonus,
} from "./model";
import { facePartSrc, mascotStack } from "./layers";

describe("mood layers", () => {
  it("maps catalog moods and aliases", () => {
    assert.equal(moodLayer("sleepy"), "sleepy");
    assert.equal(moodLayer("sad"), "sad_pillow");
    assert.equal(moodLayer("grumpy"), "pouty_arms_crossed");
    assert.equal(moodLayer("worried"), "acne");
    assert.equal(moodLayer("waiting_door_sign"), "waiting_door_sign");
  });

  it("falls back when the mood is unknown", () => {
    assert.equal(moodLayer("dragon_mode"), "normal");
    assert.equal(moodLayer(""), "normal");
    assert.equal(moodLayer(undefined), "normal");
  });
});

describe("missed-day scale", () => {
  it("steps through the beats up to the day-21 door", () => {
    assert.equal(missedDayMood(1), "normal");
    assert.equal(missedDayMood(2), "sleepy");
    assert.equal(missedDayMood(3), "sleepy");
    assert.equal(missedDayMood(4), "sad_pillow");
    assert.equal(missedDayMood(5), "sad_pillow");
    assert.equal(missedDayMood(6), "pouty_arms_crossed");
    assert.equal(missedDayMood(9), "back_turned");
    assert.equal(missedDayMood(12), "note_on_mirror");
    assert.equal(missedDayMood(15), "pot_on_head_corner");
    assert.equal(missedDayMood(18), "suitcase_leaving");
    assert.equal(missedDayMood(19), "waiting_door_sign");
    assert.equal(missedDayMood(21), "waiting_door_sign");
    assert.equal(missedDayMood(30), "waiting_door_sign");
  });

  it("grows the messy overlay and keeps suitcase at frizz + circles", () => {
    assert.equal(disheveledLevel(5, "sad_pillow"), 0);
    assert.equal(disheveledLevel(6, "pouty_arms_crossed"), 1);
    assert.equal(disheveledLevel(12, "note_on_mirror"), 2);
    assert.equal(disheveledLevel(15, "pot_on_head_corner"), 3);
    assert.equal(disheveledLevel(18, "suitcase_leaving"), 2);
    assert.equal(disheveledLevel(20, "waiting_door_sign"), 3);
    assert.equal(disheveledLevel(21, "waiting_door_sign"), 4);
  });

  it("clears the overlay on hug_return", () => {
    assert.equal(disheveledLevel(21, "hug_return"), 0);
    assert.equal(disheveledLevel(0, "hug_return"), 0);
  });

  it("puts flies and the abandoned sign only on day 21", () => {
    assert.equal(showFlies(20, "waiting_door_sign"), false);
    assert.equal(showFlies(21, "waiting_door_sign"), true);
    assert.equal(showFlies(21, "hug_return"), false);
    const door = resolveBeDaView({
      snapshot: { ...defaultSnapshot(), mood: "happy", missedDays: 21, isDefault: false },
      missedDays: 21,
      sessionHappy: false,
      locale: "vi",
    });
    assert.equal(door.mood, "waiting_door_sign");
    assert.equal(door.sign, "abandoned");
    assert.equal(door.lineKey, "waiting_door_abandoned");
    assert.equal(door.flies, true);
    assert.equal(door.disheveled, 4);
    const earlier = resolveBeDaView({
      snapshot: { ...defaultSnapshot(), missedDays: 19, isDefault: false },
      missedDays: 19,
      sessionHappy: false,
      locale: "vi",
    });
    assert.equal(earlier.mood, "waiting_door_sign");
    assert.equal(earlier.sign, "comeBack");
    assert.equal(earlier.flies, false);
  });
});

describe("check-in face and lines", () => {
  it("uses the server line and falls back to happy on an empty payload", () => {
    const fallback = resolveBeDaView({
      snapshot: defaultSnapshot(),
      missedDays: null,
      sessionHappy: false,
      locale: "vi",
    });
    assert.equal(fallback.mood, "happy");
    assert.equal(fallback.useServerLine, false);
    assert.equal(fallback.lineKey, "happy");

    const server = resolveBeDaView({
      snapshot: {
        ...defaultSnapshot(),
        mood: "acne",
        lineVi: "Ủa, mụn ai đây?",
        lineEn: "Whose bump is this?",
        isDefault: false,
        missedDays: 0,
      },
      missedDays: 0,
      sessionHappy: false,
      locale: "vi",
    });
    assert.equal(server.mood, "acne");
    assert.equal(server.useServerLine, true);
    assert.equal(server.serverLine, "Ủa, mụn ai đây?");
  });

  it("uses the gentle reminder on the first missed day", () => {
    const view = resolveBeDaView({
      snapshot: { ...defaultSnapshot(), mood: "acne", lineVi: "Ủa", isDefault: false, missedDays: 1 },
      missedDays: 1,
      sessionHappy: false,
      locale: "vi",
    });
    assert.equal(view.mood, "normal");
    assert.equal(view.lineKey, "reminder");
    assert.equal(view.useServerLine, false);
  });

  it("turns happy as soon as one session is finished", () => {
    const view = resolveBeDaView({
      snapshot: { ...defaultSnapshot(), mood: "acne", missedDays: 8, isDefault: false },
      missedDays: 8,
      sessionHappy: true,
      locale: "en",
    });
    assert.equal(view.mood, "happy");
    assert.equal(view.lineKey, "happy");
    assert.equal(view.disheveled, 1);
  });

  it("lets hug_return replace the day-21 door so the flies can leave", () => {
    const view = resolveBeDaView({
      snapshot: { ...defaultSnapshot(), mood: "hug_return", missedDays: 21, isDefault: false },
      missedDays: 21,
      sessionHappy: false,
      locale: "vi",
    });
    assert.equal(view.mood, "hug_return");
    assert.equal(view.flies, false);
    assert.equal(view.disheveled, 0);
  });
});

describe("skin marks", () => {
  it("parses stacked marks and keeps every concern", () => {
    const snap = parseMascot({
      loadout: { body: "body_chibi", hair: "hair_sleep_buns", outfit: "outfit_cozy_pajamas", accessory: "", room_items: ["room_moon"] },
      mood: "oily",
      skin_marks: [
        { concern: "acne", level: "heavy" },
        { id: "oily", level: "light" },
        "dark_spot:medium",
      ],
      skin_marks_prev: [{ concern: "acne", level: "heavy" }, { concern: "dry", level: "medium" }],
      line_vi: "Bóng nhẹ thôi mà~",
      line_en: "Just a little shine~",
      last_checkin_at: "2026-11-01T10:00:00Z",
      missed_days: 0,
      routine_today: { am_done: 1, am_total: 3, pm_done: 0, pm_total: 2 },
      last_step_done: "cleanser",
    });
    assert.deepEqual(
      snap.skinMarks.map((mark) => mark.concern),
      ["acne", "oily", "dark_spot"],
    );
    assert.equal(snap.skinMarks[1]?.level, "light");
    assert.deepEqual(
      snap.loadout.accessories.map((item) => item.id),
      ["accessory_pink_headband", "accessory_star_clip"],
    );
    assert.equal(snap.loadout.face, null);
    assert.deepEqual(snap.loadout.roomItems, [{ id: "room_moon", expiresAt: null }]);
    assert.equal(snap.routineToday.amDone, 1);
    assert.equal(parseSkinMark("nope"), null);
    const bars = concernBars(snap.skinMarks, snap.skinMarksPrev);
    assert.equal(bars.find((bar) => bar.concern === "dry")?.improved, true);
    assert.equal(bars.find((bar) => bar.concern === "dry")?.level, null);
    assert.deepEqual(improvedConcerns(snap.skinMarks, snap.skinMarksPrev), ["dry"]);
  });

  it("fades marks as the level drops", () => {
    assert.ok(markOpacity("light") < markOpacity("medium"));
    assert.ok(markOpacity("medium") < markOpacity("heavy"));
    assert.ok(markCount("light") < markCount("heavy"));
  });
});

describe("routine ticks", () => {
  it("picks a pose from the step and counts a finished session", () => {
    assert.equal(poseForStep({ category: "spf", title: "Kem chống nắng" }), "spf");
    assert.equal(poseForStep({ category: "other", title: "Sữa rửa mặt" }), "cleanser");
    assert.equal(poseForStep({ title: "Toner" }), "toner");
    assert.equal(isSessionComplete([{ completed: true }, { completed: true }]), true);
    assert.equal(isSessionComplete([{ completed: true }, { completed: false }]), false);
    assert.equal(isSessionComplete([]), false);
    assert.equal(streakDotBonus(true, false), 1);
    assert.equal(streakDotBonus(true, true), 0);
    assert.equal(missedDaysFromLast("2026-11-01", "2026-11-02"), 0);
    assert.equal(missedDaysFromLast("2026-10-12", "2026-11-02"), 20);
  });
});

describe("shop expiry and swappable face", () => {
  const now = Date.parse("2026-11-02T12:00:00Z");

  it("fades in the last day and hides after expiry", () => {
    assert.equal(itemLook(null, now), "full");
    assert.equal(itemLook("2026-11-03T06:00:00Z", now), "fading");
    assert.equal(itemLook("2026-11-04T12:00:00Z", now), "full");
    assert.equal(itemLook("2026-11-02T11:00:00Z", now), "hidden");
  });

  it("drops an expired accessory and names it once", () => {
    const snap = parseMascot({
      loadout: {
        hair: { id: "hair_sleep_buns", expires_at: "2026-11-03T00:00:00Z" },
        face: { id: "face_photo", expires_at: null },
        accessory: { id: "accessory_star_clip", expires_at: "2026-11-01T00:00:00Z" },
      },
      glow_level: 4,
      glow_progress: 0.4,
    });
    assert.equal(snap.loadout.hair.expiresAt, "2026-11-03T00:00:00Z");
    assert.equal(snap.loadout.face?.id, "face_photo");
    assert.deepEqual(expiredItemKeys(snap.loadout, now), ["accessory_star_clip@2026-11-01T00:00:00Z"]);
    const view = resolveBeDaView({
      snapshot: snap,
      missedDays: 0,
      sessionHappy: false,
      locale: "vi",
    });
    const stack = mascotStack(view, { now });
    const hair = stack.find((layer) => layer.slot === "hair");
    const accessory = stack.find((layer) => layer.slot === "accessory");
    const headband = stack.find((layer) => layer.slot === "accessory-headband");
    assert.equal(hair?.src, "/mascot/hair/hair_sleep_buns.svg");
    assert.equal(hair?.opacity, 0.5);
    assert.equal(accessory, undefined);
    assert.match(headband?.src ?? "", /accessory_pink_headband/);
    assert.equal(facePartSrc("happy", "eyes", "face_photo"), "/mascot/faces/items/face_photo/eyes.svg");
    assert.equal(
      stack.find((layer) => layer.slot === "face-eyes")?.src,
      "/mascot/faces/items/face_photo/eyes.svg",
    );
    assert.ok(stack.findIndex((layer) => layer.slot === "outfit") < stack.findIndex((layer) => layer.slot === "hair"));
    assert.ok(stack.findIndex((layer) => layer.slot === "hair") < stack.findIndex((layer) => layer.slot === "face-eyes"));
    assert.equal(stack.find((layer) => layer.slot === "outfit")?.src, "/mascot/outfit/outfit_cozy_pajamas.svg");
  });

  it("falls back to the default hair when a photo hair expires", () => {
    const view = resolveBeDaView({
      snapshot: {
        ...defaultSnapshot(),
        isDefault: false,
        loadout: {
          ...defaultSnapshot().loadout,
          hair: permanentItem("hair_photo"),
        },
      },
      missedDays: 0,
      sessionHappy: false,
      locale: "vi",
    });
    view.loadout.hair = { id: "hair_photo", expiresAt: "2026-11-01T00:00:00Z" };
    const hair = mascotStack(view, { now }).find((layer) => layer.slot === "hair");
    assert.equal(hair?.src, "/mascot/hair/hair_sleep_buns.svg");
    assert.equal(hair?.opacity, 1);
  });
});
