/**
 * Approved path-map lobby art.
 * Swap these files when a new painting arrives — the loader only stretches them.
 *
 *   public/mascot/lobby/ground.jpg   2048×2048 base
 *   public/mascot/lobby/decor.png    atlas of the props
 *   public/mascot/lobby/decor.json   frame rectangles
 *   public/mascot/lobby/layout.json  normalized positions from layout.json
 *
 * `scale` is the designer's multiplier on the texture's pixel size inside the
 * 2048 source: height = textureHeight / 2048 * scale * worldHeight.
 */

export const LOBBY_GROUND = {
  src: "/mascot/lobby/ground.jpg?v=1f14be26c2",
  size: 2048,
} as const;

export const LOBBY_DECOR = "/mascot/lobby/decor.png?v=d75074d448";
export const LOBBY_DECOR_MAP = "/mascot/lobby/decor.json?v=bbda391eac";
export const LOBBY_LAYOUT = "/mascot/lobby/layout.json?v=2ff8683f11";

export type ParkAnchor = "feet" | "center";
export type ParkKind = "prop" | "sky" | "water" | "stone" | "butterfly" | "petal";

export type ParkPiece = {
  frame: string;
  x: number;
  y: number;
  scale: number;
  anchor: ParkAnchor;
  kind: ParkKind;
  sway: boolean;
};

/** True when a feet-anchored prop would stand inside the fountain basin. */
export function parkPieceBlocksFountain(
  piece: Pick<ParkPiece, "x" | "y" | "anchor" | "kind">,
  fountain: { x: number; y: number; rx: number; ry: number },
): boolean {
  if (piece.anchor !== "feet") return false;
  if (piece.kind === "sky" || piece.kind === "petal" || piece.kind === "butterfly") return false;
  const dx = (piece.x - fountain.x) / fountain.rx;
  const dy = (piece.y - fountain.y) / fountain.ry;
  return dx * dx + dy * dy < 1;
}
