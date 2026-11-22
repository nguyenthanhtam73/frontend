import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { readFileSync } from "node:fs";

import { INTRO_RESET_CONFIRM_VI, INTRO_RESET_ERROR_VI } from "@/components/mascot/intro/be-da-intro-reset";
import { genderLook } from "@/lib/mascot/game/look";
import { applyMaleArt, facePartSrc } from "@/lib/mascot/layers";
import { defaultSnapshot, parseMascot, resolveBeDaView } from "@/lib/mascot/model";
import { mascotStack } from "@/lib/mascot/layers";
import {
  INTRO_LINE_VI,
  introDoneMessage,
  introFaceMarks,
  introChooseNow,
  introReplay,
  introResetHref,
  introShowsPicker,
  leaveClosedMascotIntro,
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
    assert.equal(introChooseNow("?chon=1"), true);
    assert.equal(introChooseNow(""), false);
    assert.equal(introShowsPicker("?chon=1"), true);
    assert.equal(introShowsPicker("?again=1"), true);
    assert.equal(introShowsPicker(""), false);
    assert.equal(introResetHref(), "/goc-binh-yen/gioi-thieu?chon=1");
    assert.equal(INTRO_RESET_CONFIRM_VI, "Bạn sẽ chọn lại Bé Da Nữ/Nam ngay bây giờ.");
    assert.equal(INTRO_RESET_ERROR_VI, "Chưa đặt lại được, thử lại nhé.");
  });

  it("tells the Android shell the intro is done, without a gender, before leaving", () => {
    const steps: string[] = [];
    leaveClosedMascotIntro(
      { postMessage: (message) => steps.push(message) },
      (href) => steps.push(href),
    );
    assert.deepEqual(steps, ['{"type":"intro_done"}', "/check-in"]);
    assert.equal(steps[0]!.includes("gender"), false);
    assert.equal(JSON.parse(steps[0]!).gender, undefined);
  });

  it("only redirects on the web, where there is no session bridge", () => {
    const steps: string[] = [];
    leaveClosedMascotIntro(null, (href) => steps.push(href));
    assert.deepEqual(steps, ["/check-in"]);
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

  it("draws the boy hair and blue pajamas for Nam, and leaves Nữ unchanged", () => {
    const female = resolveBeDaView({
      snapshot: { ...defaultSnapshot(), gender: "female", isDefault: false },
      missedDays: 0,
      sessionHappy: false,
      locale: "vi",
    });
    const male = { ...female, gender: "male" as const };
    const look = genderLook({ outfit: "outfit_pajamas", hair: "hair_sleep_buns", clip: "accessory_ribbon_bow" }, "male");
    assert.equal(look.hair, "hair_sleep_buns");
    assert.equal(look.clip, null);
    const stack = mascotStack(male, {
      dress: { outfitId: "outfit_pajamas", hairId: "hair_twin_tails", clipId: "accessory_ribbon_bow", pose: "wave" },
    });
    assert.equal(stack.find((layer) => layer.slot === "hair")?.src, "/mascot/hair/hair_boy_short.svg");
    assert.equal(stack.find((layer) => layer.slot === "outfit")?.src, "/mascot/outfits/outfit_pajamas_boy.svg");
    assert.equal(stack.find((layer) => layer.slot === "arms")?.src, "/mascot/outfits/arm_wave_right__pajamas_boy.svg");
    assert.equal(stack.find((layer) => layer.slot === "glow")?.src, "/mascot/glow/level_1_nam.svg");
    assert.equal(stack.find((layer) => layer.slot === "face-eyes")?.src, "/mascot/faces/happy_nam/eyes.svg");
    assert.equal(stack.find((layer) => layer.slot === "face-mouth")?.src, "/mascot/faces/happy_nam/mouth.svg");
    assert.equal(stack.some((layer) => layer.src.includes("/accessory/") || layer.src.includes("twin_tails")), false);
    const dress = (outfitId: "outfit_vay_hoa" | "outfit_ao_len" | "outfit_ao_dai" | "outfit_hoodie") =>
      mascotStack(male, {
        dress: { outfitId, hairId: "hair_sleep_buns", clipId: null, pose: "cheer" },
      });
    const floral = dress("outfit_vay_hoa");
    assert.equal(floral.find((layer) => layer.slot === "outfit")?.src, "/mascot/outfits/outfit_vay_hoa_boy.svg");
    assert.equal(floral.find((layer) => layer.slot === "arms")?.src, "/mascot/outfits/arms_up__vay_hoa_boy.svg");
    const sweater = dress("outfit_ao_len");
    assert.equal(sweater.find((layer) => layer.slot === "outfit")?.src, "/mascot/outfits/outfit_ao_len_boy.svg");
    assert.equal(sweater.find((layer) => layer.slot === "arms")?.src, "/mascot/outfits/arms_up__ao_len_boy.svg");
    const tunic = dress("outfit_ao_dai");
    assert.equal(tunic.find((layer) => layer.slot === "outfit")?.src, "/mascot/outfits/outfit_ao_dai_boy.svg");
    assert.equal(tunic.find((layer) => layer.slot === "arms")?.src, "/mascot/outfits/arms_up__ao_dai_boy.svg");
    const hoodie = dress("outfit_hoodie");
    assert.equal(hoodie.find((layer) => layer.slot === "outfit")?.src, "/mascot/outfits/outfit_hoodie.svg");
    assert.equal(hoodie.find((layer) => layer.slot === "arms")?.src, "/mascot/outfits/arms_up__hoodie.svg");
    const femaleStack = mascotStack(female, {
      dress: { outfitId: "outfit_pajamas", hairId: "hair_sleep_buns", clipId: "accessory_ribbon_bow" },
    });
    assert.equal(femaleStack.find((layer) => layer.slot === "hair")?.src, "/mascot/hair/hair_sleep_buns.svg");
    assert.equal(femaleStack.find((layer) => layer.slot === "outfit")?.src, "/mascot/outfits/outfit_pajamas.svg");
    assert.equal(femaleStack.find((layer) => layer.slot === "glow")?.src, "/mascot/glow/level_1.svg");
    assert.equal(femaleStack.find((layer) => layer.slot === "face-eyes")?.src, "/mascot/faces/happy/eyes.svg");
    assert.equal(facePartSrc("sad_pillow", "brows", null, "male"), "/mascot/faces/sad_pillow_nam/brows.svg");
    assert.equal(facePartSrc("sad_pillow", "brows", "face_photo", "male"), "/mascot/faces/items/face_photo/brows.svg");
    assert.equal(femaleStack.some((layer) => layer.src.includes("ribbon_bow")), true);
    const stripped = applyMaleArt([
      { slot: "hair", src: "/mascot/hair/hair_sleep_buns.svg", opacity: 1 },
      { slot: "outfit", src: "/mascot/outfit/outfit_cozy_pajamas.svg", opacity: 1 },
      { slot: "accessory", src: "/mascot/accessory/accessory_star_clip.svg", opacity: 1 },
      { slot: "body", src: "/mascot/body/body_chibi.svg", opacity: 1 },
      { slot: "glow", src: "/mascot/glow/level_1.svg", opacity: 1 },
    ]);
    assert.deepEqual(
      stripped.map((layer) => layer.src),
      [
        "/mascot/hair/hair_boy_short.svg",
        "/mascot/outfits/outfit_pajamas_boy.svg",
        "/mascot/body/body_chibi.svg",
        "/mascot/glow/level_1_nam.svg",
      ],
    );
    const girl = readFileSync(new URL("../../public/mascot/glow/level_1.svg", import.meta.url), "utf8");
    const boy = readFileSync(new URL("../../public/mascot/glow/level_1_nam.svg", import.meta.url), "utf8");
    assert.match(girl, /#F4A5C0/);
    assert.match(girl, /M100 62/);
    assert.match(girl, /M88 158/);
    assert.match(boy, /#8FB6E8/);
    assert.equal(boy.includes("#F4A5C0"), false);
    assert.equal(boy.includes("#D97AA6"), false);
    assert.equal(boy.includes("#FF9CC6"), false);
    assert.match(boy, /M100 62/);
    assert.match(boy, /M88 158/);
  });
});
