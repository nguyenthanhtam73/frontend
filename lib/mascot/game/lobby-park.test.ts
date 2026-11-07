import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { LOBBY_WALK_MASK } from "@/lib/mascot/game/lobby-walk";
import { LOBBY_FOUNTAIN } from "@/lib/mascot/game/walk";
import { LOBBY_DECOR, LOBBY_DECOR_MAP, LOBBY_GROUND, LOBBY_LAYOUT, parkPieceBlocksFountain, type ParkPiece } from "@/lib/mascot/game/lobby-park";

const layoutPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../public/mascot/lobby/layout.json");

describe("lobby park dressing", () => {
  it("keeps feet-anchored props out of the fountain", () => {
    const layout = JSON.parse(fs.readFileSync(layoutPath, "utf8")) as { pieces: ParkPiece[] };
    assert.ok(layout.pieces.some((piece) => piece.frame === "02_fountain"));
    assert.equal(layout.pieces.some((piece) => parkPieceBlocksFountain(piece, LOBBY_FOUNTAIN)), false);
  });

  it("versions lobby pictures so a year-long cache cannot keep the old mask", () => {
    const dir = path.dirname(layoutPath);
    const hashed = [
      [LOBBY_WALK_MASK, "walk-mask.png"],
      [LOBBY_GROUND.src, "ground.jpg"],
      [LOBBY_DECOR, "decor.png"],
      [LOBBY_DECOR_MAP, "decor.json"],
      [LOBBY_LAYOUT, "layout.json"],
    ] as const;
    for (const [url, file] of hashed) {
      const digest = createHash("sha256").update(fs.readFileSync(path.join(dir, file))).digest("hex").slice(0, 10);
      assert.equal(url.includes(`?v=${digest}`), true, file);
    }
  });
});
