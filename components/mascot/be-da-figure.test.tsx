import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "node:test";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import { MASCOT_CATALOG } from "@/lib/mascot/catalog";
import { parseMascot, resolveBeDaView } from "@/lib/mascot/model";

/** Shape of GET /api/v1/me/mascot from the backend mascot DTO. */
const backendMascot = {
  loadout: {
    body: "body_chibi",
    hair: "hair_sleep_buns",
    outfit: "outfit_cozy_pajamas",
    accessory: "accessory_star_clip",
    room_items: ["room_moon", "room_plant", "room_pillow"],
  },
  mood: "happy",
  line_vi: "Da vui rồi nè~",
  line_en: "Skin's happy today~",
  skin_marks: [{ id: "acne", level: "light" }],
  skin_marks_prev: [],
  last_checkin_at: "2026-11-02T08:00:00Z",
  routine_today: { am_done: 1, am_total: 3, pm_done: 0, pm_total: 2 },
  last_step_done: "cleanser",
  streak_days: 2,
  missed_days: 0,
  messy_level: 0,
};

function renderPayload(payload: unknown) {
  const snapshot = parseMascot(payload);
  const view = resolveBeDaView({
    snapshot,
    missedDays: snapshot.missedDays,
    sessionHappy: false,
    locale: "vi",
  });
  return renderToStaticMarkup(<BeDaFigure view={view} locale="vi" />);
}

describe("Bé Da backend payload", () => {
  it("renders body, hair, and outfit from the catalog ids", () => {
    const html = renderPayload(backendMascot);
    assert.match(html, /src="\/mascot\/body\/body_chibi\.svg"/);
    assert.match(html, /src="\/mascot\/hair\/hair_sleep_buns\.svg"/);
    assert.match(html, /src="\/mascot\/outfit\/outfit_cozy_pajamas\.svg"/);
    assert.match(html, /src="\/mascot\/glow\/level_1\.svg"/);
    assert.equal(html.includes("_floor.svg"), false);
    assert.match(html, /data-glow-level="1"/);
    assert.match(html, /data-level="1"/);
    assert.match(html, /bd-figure/);
    assert.match(html, /bd-breathe/);
    assert.equal(html.includes("be-da-breathe"), false);
    assert.equal(html.includes("be-da-blink"), false);
    const lids = html.match(/<img[^>]*\/mascot\/fx\/eyelids\.svg[^>]*>/)?.[0] ?? "";
    assert.match(lids, /bd-lids/);
    assert.equal(lids.includes("opacity"), false);
    assert.match(html, /be-da-yawn/);
    assert.equal(html.includes("accessory_pink_headband"), false);
    assert.equal(html.includes("accessory_star_clip"), false);
    assert.equal(MASCOT_CATALOG.some((item) => item.id === "accessory_pink_headband"), true);
    assert.equal(MASCOT_CATALOG.some((item) => item.id === "room_moon"), true);
  });

  it("falls unknown body, hair, and outfit ids back to the defaults", () => {
    const html = renderPayload({
      ...backendMascot,
      loadout: {
        body: "body_default",
        hair: "hair_unknown",
        outfit: "outfit_nope",
        accessory: "accessory_pink_headband",
        room_items: ["room_moon", "room_not_real"],
      },
      glow_level: 3,
      glow_progress: 0.4,
    });
    assert.match(html, /src="\/mascot\/body\/body_chibi\.svg"/);
    assert.match(html, /src="\/mascot\/hair\/hair_sleep_buns\.svg"/);
    assert.match(html, /src="\/mascot\/outfit\/outfit_cozy_pajamas\.svg"/);
    assert.match(html, /src="\/mascot\/accessory\/accessory_pink_headband\.svg"/);
    assert.match(html, /src="\/mascot\/props\/room_moon\.svg"/);
    assert.match(html, /data-level="3"/);
    assert.match(html, /bd-breathe/);
    assert.equal(html.includes("body_default"), false);
    assert.equal(html.includes("hair_unknown"), false);
    assert.equal(html.includes("outfit_nope"), false);
    assert.equal(html.includes("room_not_real"), false);
  });

  it("keeps the routine-tick jump on the breathing figure", () => {
    const snapshot = parseMascot({ ...backendMascot, glow_level: 5 });
    const view = resolveBeDaView({
      snapshot,
      missedDays: snapshot.missedDays,
      sessionHappy: false,
      locale: "vi",
    });
    const html = renderToStaticMarkup(<BeDaFigure view={view} locale="vi" celebrate />);
    assert.match(html, /data-level="5"/);
    assert.match(html, /bd-breathe/);
    assert.match(html, /be-da-jump/);
    const floor = html.indexOf("/mascot/glow/level_5_floor.svg");
    const breathe = html.indexOf("bd-breathe");
    assert.ok(floor >= 0 && floor < breathe);
  });
});
