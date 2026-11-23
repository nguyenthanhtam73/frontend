/**
 * Chat-bubble colours from the xu-shop handoff (`mau_bong_chat.json`).
 * Drawn with CSS. The four ids are art colours, not shop SKUs.
 * Backend PR 81 only sells `shop_bubble_la`.
 */

export type BubbleColour = {
  id: string;
  name: string;
  background: string;
  color: string;
  border: string;
  shadow: string;
};

export const BUBBLE_COLOURS: readonly BubbleColour[] = [
  { id: "kem_hong", name: "Bóng kem hồng", background: "#FFF1F4", color: "#6B3A44", border: "#E07A9A", shadow: "#E8B8C4" },
  { id: "mint_mat", name: "Bóng mint mát", background: "#E7F7F2", color: "#1F3B3A", border: "#4EAEA0", shadow: "#B5D9D0" },
  { id: "vang_mat", name: "Bóng vàng mật", background: "#FFF8E6", color: "#7A4A3A", border: "#E0B24A", shadow: "#E8D2A0" },
  { id: "dao_cam", name: "Bóng đào cam", background: "#FFEDE3", color: "#6B3E32", border: "#E08A62", shadow: "#E8C4B0" },
];

const BY_ID = new Map(BUBBLE_COLOURS.map((colour) => [colour.id, colour]));

/** A known colour, or null. `shop_bubble_la` is a different item and stays null. */
export function bubbleColour(id: string | null | undefined): BubbleColour | null {
  if (!id) return null;
  return BY_ID.get(id) ?? null;
}

/** Frame and text colours for one equipped bubble. Text colour is the handoff ink. */
export function bubbleFrameStyle(id: string | null | undefined): {
  background: string;
  color: string;
  border: string;
  boxShadow: string;
  "--bubble-tail": string;
} | undefined {
  const colour = bubbleColour(id);
  if (!colour) return undefined;
  return {
    background: colour.background,
    color: colour.color,
    border: `2.5px solid ${colour.border}`,
    boxShadow: `0 3px 0 ${colour.shadow}`,
    "--bubble-tail": colour.background,
  };
}
