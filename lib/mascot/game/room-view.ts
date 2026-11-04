import { moodLayer, type BeDaView } from "@/lib/mascot/model";

/**
 * The game room and lobby stay cosy. The home missed-day story
 * (pillow, mirror note, pot, suitcase, door, abandoned sign, tears, flies, sitting)
 * never shows here. Neglect becomes a standing sleepy Bé Da with zzz
 * and at most light messy hair. The home page is unchanged.
 */
const NEGLECT = new Set([
  "sad_pillow",
  "pouty_arms_crossed",
  "back_turned",
  "note_on_mirror",
  "pot_on_head_corner",
  "suitcase_leaving",
  "waiting_door_sign",
]);

/** Home moods that used to show the door, notes, and other sad props. */
export function roomNeglect(view: BeDaView): boolean {
  return NEGLECT.has(moodLayer(view.mood));
}

export function gameRoomView(view: BeDaView): BeDaView {
  const neglect = roomNeglect(view);
  return {
    ...view,
    mood: neglect ? "sleepy" : view.mood,
    lineKey: neglect ? "sleepy" : view.lineKey,
    useServerLine: neglect ? false : view.useServerLine,
    // The room draws its own furniture, so home stickers (moon, plant, pillow) stay off.
    loadout: { ...view.loadout, roomItems: [] },
    flies: false,
    sign: "comeBack",
    disheveled: view.disheveled > 1 ? 1 : view.disheveled,
  };
}
