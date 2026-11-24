import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import { GAME_ICONS } from "@/components/mascot/game/icons";
import { shellArt } from "@/lib/game/core/art";
import {
  MASCOT_ASSET_VERSION,
  MASCOT_CACHE_CONTROL,
  mascotAssetHeaders,
  mascotAssetPath,
  mascotAssetUrl,
  mascotSheetImageUrl,
} from "@/lib/mascot/asset-url";
import { sheetJsonUrlFromArt, sheetKeyFromArt } from "@/lib/mascot/game/actor-sheet";
import { LOBBY_DECOR, LOBBY_DECOR_MAP, LOBBY_GROUND, LOBBY_LAYOUT } from "@/lib/mascot/game/lobby-park";
import { LOBBY_WALK_MASK } from "@/lib/mascot/game/lobby-walk";
import { DEFAULT_GAME_LOOK } from "@/lib/mascot/game/look";
import { ROOM_WALK_MASK } from "@/lib/mascot/game/room-walk";
import { armMarkup, chinArmSrc, sleeveArmSrc } from "@/lib/mascot/game/sheet-arms";
import { WARDROBE_CATALOG, wardrobeThumbSrc } from "@/lib/mascot/game/wardrobe";
import { mascotStack } from "@/lib/mascot/layers";
import { defaultSnapshot, resolveBeDaView } from "@/lib/mascot/model";

import nextConfig from "../../next.config";

const VERSIONED = new RegExp(`(?:\\?|&)v=${MASCOT_ASSET_VERSION}(?:&|$)`);

function assertVersioned(url: string): void {
  assert.match(url, VERSIONED, url);
  assert.equal(url.includes("immutable"), false, url);
}

describe("mascot asset urls", () => {
  it("appends ?v=5, keeps a file hash as h, and skips API paths", () => {
    assert.equal(MASCOT_ASSET_VERSION, "5");
    assert.equal(mascotAssetUrl("/mascot/body/body_chibi.svg"), "/mascot/body/body_chibi.svg?v=5");
    const once = mascotAssetUrl("/mascot/body/body_chibi.svg");
    assert.equal(mascotAssetUrl(once), once);
    assert.equal(
      mascotAssetUrl("/mascot/room/walk-mask.png?v=b8b3891a73"),
      "/mascot/room/walk-mask.png?v=5&h=b8b3891a73",
    );
    assert.equal(
      mascotAssetUrl('url("/mascot/rooms/spa-room.webp")'),
      'url("/mascot/rooms/spa-room.webp?v=5")',
    );
    assert.equal(
      mascotAssetUrl('<image href="/mascot/fx/eyelids.svg"/>'),
      '<image href="/mascot/fx/eyelids.svg?v=5"/>',
    );
    assert.equal(mascotAssetUrl("/api/v1/mascot/rooms/DA7K2M/quest"), "/api/v1/mascot/rooms/DA7K2M/quest");
    assert.equal(mascotAssetPath("/mascot/hair/hair_sleep_buns.svg?v=5"), "/mascot/hair/hair_sleep_buns.svg");
    assert.equal(MASCOT_CACHE_CONTROL.includes("immutable"), false);
    assert.match(MASCOT_CACHE_CONTROL, /max-age=0/);
    assert.match(MASCOT_CACHE_CONTROL, /must-revalidate/);
  });

  it("versions every /mascot URL the loaders hand to the browser", () => {
    const view = resolveBeDaView({
      snapshot: { ...defaultSnapshot(), isDefault: false, glowLevel: 5 },
      missedDays: 0,
      sessionHappy: false,
      locale: "vi",
    });
    const dress = {
      outfitId: DEFAULT_GAME_LOOK.outfit,
      hairId: DEFAULT_GAME_LOOK.hair,
      clipId: null,
      pose: "wave" as const,
    };
    const stack = mascotStack(view, { dress, stepPose: "cleanser" });
    const art = shellArt(view, dress, false);
    const urls = [
      ...stack.map((layer) => layer.src),
      ...art,
      ...Object.values(GAME_ICONS),
      ...WARDROBE_CATALOG.map((item) => wardrobeThumbSrc(item)),
      sleeveArmSrc("/mascot/outfits/outfit_pajamas.svg"),
      chinArmSrc("/mascot/outfits/outfit_hoodie.svg?v=5"),
      sheetJsonUrlFromArt(art),
      mascotSheetImageUrl("outfit_pajamas__hair_sleep_buns__211451dc.png"),
      ROOM_WALK_MASK,
      LOBBY_WALK_MASK,
      LOBBY_GROUND.src,
      LOBBY_DECOR,
      LOBBY_DECOR_MAP,
      LOBBY_LAYOUT,
      mascotAssetUrl("/mascot/props/sink.svg"),
      mascotAssetUrl("/mascot/props/wardrobe.svg"),
      mascotAssetUrl("/mascot/fx/hearts.svg"),
      mascotAssetUrl("/mascot/fx/flies/flies.svg"),
      mascotAssetUrl(`/mascot/glow/level_${view.glowLevel}_floor.svg`),
    ];
    for (const match of armMarkup("/mascot/outfits/outfit_pajamas.svg", "walk", 1).matchAll(/src="([^"]+)"/g)) {
      urls.push(match[1] ?? "");
    }
    assert.ok(urls.length > 20);
    for (const url of urls) {
      assert.equal(url.includes("/mascot/"), true, url);
      assertVersioned(url);
    }
    assert.equal(sheetKeyFromArt(art), sheetKeyFromArt(art.map(mascotAssetPath)));
    assert.equal(sheetJsonUrlFromArt(art), sheetJsonUrlFromArt(art.map(mascotAssetPath)));
  });

  it("versions the spa-room plate and cucumber cheeks in CSS", () => {
    const css = fs.readFileSync(
      path.join(process.cwd(), "components/mascot/game/be-da-game.css"),
      "utf8",
    );
    const found = [...css.matchAll(/url\("(\/mascot\/[^"]+)"\)/g)].map((match) => match[1] ?? "");
    const spa = path.join(process.cwd(), "public/mascot/rooms/spa-room.webp");
    const spa2 = path.join(process.cwd(), "public/mascot/rooms/spa-room@2x.webp");
    const land = path.join(process.cwd(), "public/mascot/rooms/spa-room-landscape.webp");
    const land2 = path.join(process.cwd(), "public/mascot/rooms/spa-room-landscape@2x.webp");
    const cheeks = path.join(process.cwd(), "public/mascot/props/cucumber_cheeks.svg");
    const spaDigest = createHash("sha256").update(fs.readFileSync(spa)).digest("hex").slice(0, 10);
    const spa2Digest = createHash("sha256").update(fs.readFileSync(spa2)).digest("hex").slice(0, 10);
    const landDigest = createHash("sha256").update(fs.readFileSync(land)).digest("hex").slice(0, 10);
    const land2Digest = createHash("sha256").update(fs.readFileSync(land2)).digest("hex").slice(0, 10);
    const cheekDigest = createHash("sha256").update(fs.readFileSync(cheeks)).digest("hex").slice(0, 10);
    const spaUrl = mascotAssetUrl(`/mascot/rooms/spa-room.webp?v=${spaDigest}`);
    const spa2Url = mascotAssetUrl(`/mascot/rooms/spa-room@2x.webp?v=${spa2Digest}`);
    const landUrl = mascotAssetUrl(`/mascot/rooms/spa-room-landscape.webp?v=${landDigest}`);
    const land2Url = mascotAssetUrl(`/mascot/rooms/spa-room-landscape@2x.webp?v=${land2Digest}`);
    const cheekUrl = mascotAssetUrl(`/mascot/props/cucumber_cheeks.svg?v=${cheekDigest}`);
    assert.equal(spaDigest, "1458c4b802");
    assert.equal(spa2Digest, "9435973f95");
    assert.equal(landDigest, "cd2b64e658");
    assert.equal(land2Digest, "8295fddc4c");
    assert.equal(cheekDigest, "cac8ba93e0");
    assert.notEqual(landDigest, spaDigest);
    assert.deepEqual(found, [
      spaUrl, spaUrl, spa2Url,
      spaUrl, spaUrl, spa2Url,
      spaUrl, spaUrl, spa2Url,
      cheekUrl,
      landUrl, landUrl, land2Url,
    ]);
    for (const url of found) {
      const params = new URL(url, "https://dadiary.vn").searchParams;
      const fileDigest = url.includes("cucumber_cheeks")
        ? cheekDigest
        : url.includes("landscape@2x")
          ? land2Digest
          : url.includes("landscape")
            ? landDigest
            : url.includes("spa-room@2x")
              ? spa2Digest
              : spaDigest;
      assert.equal(params.get("v"), MASCOT_ASSET_VERSION);
      assert.equal(params.get("h"), fileDigest);
    }
  });

  it("serves /mascot with a revalidating cache and no immutable", async () => {
    assert.deepEqual(mascotAssetHeaders(), [
      {
        source: "/mascot/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ]);
    const headers = await nextConfig.headers!();
    assert.ok(Array.isArray(headers));
    assert.deepEqual(headers, mascotAssetHeaders());
    const value = headers
      .find((rule) => rule.source === "/mascot/:path*")
      ?.headers.find((header) => header.key === "Cache-Control")?.value;
    assert.equal(value, "public, max-age=0, must-revalidate");
    assert.equal(value?.includes("immutable"), false);
  });
});
