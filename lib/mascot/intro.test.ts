import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { genderLook } from "@/lib/mascot/game/look";
import { malePlaceholder } from "@/lib/mascot/layers";
import { defaultSnapshot, parseMascot, resolveBeDaView } from "@/lib/mascot/model";
import { mascotStack } from "@/lib/mascot/layers";
import {
  INTRO_LINE_VI,
  introDoneMessage,
  introFaceMarks,
  introReplay,
  marksFromFirstSkin,
  postIntroDone,
} from "@/lib/mascot/intro";

describe("Bé Da intro", () => {
  it("defaults the pick to Nữ and keeps the warm line", () => {
    assert.equal(INTRO_LINE_VI, "Bé Da này sẽ đi cùng bạn, nhớ chăm sóc bé thật tốt nhé");
    const view = resolveBeDaView({
      snapshot: defaultSnapshot(),
      missedDays: 0,
      sessionHappy: false,
      locale: "vi",
    });
    assert.equal(view.gender, "female");
  });

  it("posts intro_done with the saved gender", () => {
    const sent: string[] = [];
    const posted = postIntroDone({ postMessage: (message) => sent.push(message) }, "male");
    assert.equal(posted, true);
    assert.equal(sent[0], introDoneMessage("male"));
    assert.deepEqual(JSON.parse(sent[0]!), { type: "intro_done", gender: "male" });
    assert.equal(postIntroDone(null, "female"), false);
    assert.equal(introReplay("?again=1"), true);
    assert.equal(introReplay(""), false);
  });

  it("maps a first cheek read to a few light spots", () => {
    const marks = marksFromFirstSkin({
      analysis: {
        concerns: ["acne"],
        severity_level: "mild",
        primary_regions: ["cheeks"],
        main_concerns: ["acne"],
      },
    });
    assert.deepEqual(marks, [{ concern: "acne", level: "light" }]);
    assert.deepEqual(introFaceMarks(marks, [{ concern: "dry", level: "heavy" }]), marks);
  });

  it("keeps a dense first read gentle", () => {
    const marks = marksFromFirstSkin({
      analysis: {
        severity_level: "dense",
        main_concerns: ["inflammatory_acne", "redness"],
        skin_observations: {
          acne_status: "active_dense",
          oiliness_level: "moderate",
          redness: "high",
          pigmentation: "mild",
        },
      },
    });
    assert.deepEqual(
      marks.map((mark) => mark.concern),
      ["acne", "red", "dark_spot", "oily"],
    );
    assert.ok(marks.every((mark) => mark.level === "medium"));
  });

  it("reads gender and intro_seen from the mascot payload", () => {
    const snap = parseMascot({ gender: "male", intro_seen: true, mood: "happy" });
    assert.equal(snap.gender, "male");
    assert.equal(snap.introSeen, true);
    assert.equal(parseMascot({ mood: "happy" }).introSeen, null);
  });

  it("uses short hair and no bows for the male placeholder", () => {
    const female = resolveBeDaView({
      snapshot: { ...defaultSnapshot(), gender: "female", isDefault: false },
      missedDays: 0,
      sessionHappy: false,
      locale: "vi",
    });
    const male = { ...female, gender: "male" as const };
    const look = genderLook({ outfit: "outfit_pajamas", hair: "hair_sleep_buns", clip: "accessory_ribbon_bow" }, "male");
    assert.equal(look.hair, "hair_short_bob");
    assert.equal(look.clip, null);
    const stack = mascotStack(male, {
      dress: { outfitId: "outfit_pajamas", hairId: "hair_twin_tails", clipId: "accessory_ribbon_bow" },
    });
    const hair = stack.find((layer) => layer.slot === "hair");
    assert.equal(hair?.src, "/mascot/hair/hair_short_bob.svg");
    assert.equal(stack.some((layer) => layer.src.includes("ribbon_bow") || layer.src.includes("headband") || layer.src.includes("twin_tails")), false);
    const stripped = malePlaceholder([
      { slot: "hair", src: "/mascot/hair/hair_sleep_buns.svg", opacity: 1 },
      { slot: "accessory-headband", src: "/mascot/accessory/accessory_pink_headband.svg", opacity: 1 },
    ]);
    assert.equal(stripped.length, 1);
    assert.equal(stripped[0]?.src, "/mascot/hair/hair_short_bob.svg");
  });
});
