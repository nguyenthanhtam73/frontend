/** Local choices for the trial screen. No server round-trip. */

export const GAME_SOUND_KEY = "beda-game-sound";
export const GAME_WAVE_KEY = "beda-game-wave-day";
export const GAME_CHEST_KEY = "beda-game-chest-day";

type Store = Pick<Storage, "getItem" | "setItem">;

/**
 * Sound starts on until the person picks. A saved "on" or "off" always wins.
 */
export function readSoundEnabled(storage: Pick<Storage, "getItem">): boolean {
  const value = storage.getItem(GAME_SOUND_KEY);
  if (value === "off") return false;
  if (value === "on") return true;
  return true;
}

export function writeSoundEnabled(storage: Store, enabled: boolean): void {
  storage.setItem(GAME_SOUND_KEY, enabled ? "on" : "off");
}

export function readDayFlag(storage: Pick<Storage, "getItem">, key: string, today: string): boolean {
  return storage.getItem(key) === today;
}

export function writeDayFlag(storage: Store, key: string, today: string): void {
  storage.setItem(key, today);
}
