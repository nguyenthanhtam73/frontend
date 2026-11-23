import { TREE_CLOSET, isTreeWearClip, type TreeReward } from "@/lib/mascot/game/room-tree";

const KEY = "beda-tree-gifts";

export type TreeGift = {
  id: string;
  name: string;
  previewOnly: boolean;
};

type ClosetFile = {
  items: TreeGift[];
  worn: string | null;
};

const EMPTY: ClosetFile = { items: [], worn: null };

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeTreeCloset(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function readFile(storage: Pick<Storage, "getItem"> | null): ClosetFile {
  if (!storage) return EMPTY;
  const raw = storage.getItem(KEY);
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw) as { items?: unknown; worn?: unknown };
    const items: TreeGift[] = [];
    if (Array.isArray(parsed.items)) {
      for (const item of parsed.items) {
        if (!item || typeof item !== "object") continue;
        const row = item as { id?: unknown; name?: unknown; previewOnly?: unknown };
        if (typeof row.id !== "string" || !row.id) continue;
        const known = TREE_CLOSET.find((entry) => entry.id === row.id);
        items.push({
          id: row.id,
          name: typeof row.name === "string" && row.name.trim() ? row.name.trim() : known?.name ?? row.id,
          previewOnly: row.previewOnly === true || known?.previewOnly === true,
        });
      }
    }
    const worn = typeof parsed.worn === "string" ? parsed.worn : null;
    return { items, worn };
  } catch {
    return EMPTY;
  }
}

function writeFile(storage: Pick<Storage, "getItem" | "setItem">, file: ClosetFile): void {
  storage.setItem(KEY, JSON.stringify(file));
  emit();
}

function browserStorage(): Pick<Storage, "getItem" | "setItem"> | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function readTreeGifts(storage: Pick<Storage, "getItem"> | null): TreeGift[] {
  return readFile(storage).items;
}

export function wornTreeClip(storage: Pick<Storage, "getItem"> | null): string | null {
  const file = readFile(storage);
  if (!file.worn || !isTreeWearClip(file.worn)) return null;
  if (!file.items.some((item) => item.id === file.worn && !item.previewOnly)) return null;
  return file.worn;
}

/** Merge granted pieces into the closet. Preview-only rows stay preview-only. */
export function rememberTreeGifts(
  storage: Pick<Storage, "getItem" | "setItem">,
  rewards: readonly Pick<TreeReward, "itemId" | "itemName" | "previewOnly">[],
): void {
  const file = readFile(storage);
  let changed = false;
  for (const reward of rewards) {
    if (!reward.itemId) continue;
    const known = TREE_CLOSET.find((entry) => entry.id === reward.itemId);
    const gift: TreeGift = {
      id: reward.itemId,
      name: reward.itemName || known?.name || reward.itemId,
      previewOnly: reward.previewOnly || known?.previewOnly === true,
    };
    const index = file.items.findIndex((item) => item.id === gift.id);
    if (index < 0) {
      file.items.push(gift);
      changed = true;
    } else if (file.items[index]?.name !== gift.name || file.items[index]?.previewOnly !== gift.previewOnly) {
      file.items[index] = gift;
      changed = true;
    }
  }
  if (changed) writeFile(storage, file);
}

/** Wear a clip that is owned and not preview-only. Null takes it off. */
export function wearTreeClip(storage: Pick<Storage, "getItem" | "setItem">, id: string | null): boolean {
  const file = readFile(storage);
  if (id == null) {
    if (file.worn == null) return true;
    file.worn = null;
    writeFile(storage, file);
    return true;
  }
  const owned = file.items.some((item) => item.id === id && !item.previewOnly);
  if (!owned || !isTreeWearClip(id)) return false;
  file.worn = id;
  writeFile(storage, file);
  return true;
}

export function currentTreeGifts(): TreeGift[] {
  return readTreeGifts(browserStorage());
}

export function currentWornTreeClip(): string | null {
  return wornTreeClip(browserStorage());
}

export function saveTreeGifts(rewards: readonly Pick<TreeReward, "itemId" | "itemName" | "previewOnly">[]): void {
  const storage = browserStorage();
  if (!storage) return;
  rememberTreeGifts(storage, rewards);
}

export function saveWornTreeClip(id: string | null): boolean {
  const storage = browserStorage();
  if (!storage) return false;
  return wearTreeClip(storage, id);
}
