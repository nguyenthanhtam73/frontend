import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { actorClip, lookFromArt, sheetJsonUrlFromArt, sheetKey, sheetKeyFromArt } from "./actor-sheet";

describe("actor sheet", () => {
  it("names a sheet from the outfit and hair", () => {
    assert.equal(sheetKey("outfit_hoodie", "hair_short_bob"), "outfit_hoodie__hair_short_bob");
    assert.equal(sheetKey("nope", "nope"), "outfit_pajamas__hair_sleep_buns");
  });

  it("gives a bow its own sheet and keeps the name stable", () => {
    const plain = ["/mascot/outfits/outfit_pajamas.svg", "/mascot/hair/hair_twin_tails.svg"];
    const bowed = [...plain, "/mascot/accessory/accessory_ribbon_bow.svg", "/mascot/accessory/accessory_pink_headband.svg"];
    assert.notEqual(sheetKeyFromArt(plain), sheetKeyFromArt(bowed));
    assert.equal(sheetKeyFromArt(bowed), sheetKeyFromArt(bowed));
    assert.match(sheetJsonUrlFromArt(bowed), /^\/mascot\/game\/sheets\/outfit_pajamas__hair_twin_tails__[0-9a-f]{8}\.json$/);
  });

  it("reads the closet ids out of the layer list", () => {
    const look = lookFromArt([
      "/mascot/body/body_chibi.svg",
      "/mascot/outfits/outfit_vay_hoa.svg",
      "/mascot/hair/hair_high_pony.svg",
      "/mascot/faces/happy/eyes.svg",
    ]);
    assert.deepEqual(look, { outfit: "outfit_vay_hoa", hair: "hair_high_pony" });
  });

  it("plays walk while moving and wave only when still", () => {
    assert.equal(actorClip(true, "wave"), "walk");
    assert.equal(actorClip(true, null), "walk");
    assert.equal(actorClip(false, "wave"), "wave");
    assert.equal(actorClip(false, "cheer"), "wave");
    assert.equal(actorClip(false, null), "idle");
  });
});
