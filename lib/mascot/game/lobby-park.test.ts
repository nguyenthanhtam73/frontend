import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { LOBBY_FOUNTAIN } from "@/lib/mascot/game/walk";
import { parkPieceBlocksFountain, type ParkPiece } from "@/lib/mascot/game/lobby-park";

const layoutPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../../public/mascot/lobby/layout.json");

describe("lobby park dressing", () => {
  it("keeps feet-anchored props out of the fountain", () => {
    const layout = JSON.parse(fs.readFileSync(layoutPath, "utf8")) as { pieces: ParkPiece[] };
    assert.ok(layout.pieces.some((piece) => piece.frame === "02_fountain"));
    assert.equal(layout.pieces.some((piece) => parkPieceBlocksFountain(piece, LOBBY_FOUNTAIN)), false);
  });
});
