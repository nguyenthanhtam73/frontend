import { apiPut } from "@/lib/api-client";
import { fetchMascot } from "@/lib/api/mascot";
import { mascotQueryKey as mascotKey } from "@/lib/mascot/query-key";
import { permanentItem, type MascotLoadout, type MascotSnapshot } from "@/lib/mascot/model";
import { isTreeWearClip } from "@/lib/mascot/game/room-tree";
import type { QueryClient } from "@tanstack/react-query";

const wearCall = { toastOnError: false, credentials: "include" as const };

/**
 * PUT /api/v1/me/mascot/loadout. The hair clip is an accessory the server
 * already granted in user_mascot_items. Friends read it from this loadout.
 */
export async function wearMascotClip(queryClient: QueryClient, itemId: string | null): Promise<boolean> {
  let current = queryClient.getQueryData<MascotSnapshot | null>(mascotKey);
  if (current == null) {
    current = await queryClient.fetchQuery({ queryKey: mascotKey, queryFn: fetchMascot });
  }
  if (!current) return false;
  if (itemId && !isTreeWearClip(itemId)) return false;
  const previous = current;
  const next = withTreeClip(current, itemId);
  queryClient.setQueryData(mascotKey, next);
  try {
    await apiPut("/api/v1/me/mascot/loadout", loadoutBody(next.loadout, itemId), wearCall);
  } catch (err) {
    queryClient.setQueryData(mascotKey, previous);
    throw err;
  }
  await queryClient.invalidateQueries({ queryKey: mascotKey });
  return true;
}

function withTreeClip(snapshot: MascotSnapshot, clipId: string | null): MascotSnapshot {
  const kept = snapshot.loadout.accessories.filter((item) => !isTreeWearClip(item.id));
  const accessories = clipId ? [...kept, permanentItem(clipId)] : kept;
  const owned = snapshot.ownedItems.filter((item) => item.id !== clipId);
  if (clipId && !owned.some((item) => item.id === clipId)) {
    owned.push({ id: clipId, name: clipId, layer: "accessory", previewOnly: false });
  }
  return {
    ...snapshot,
    ownedItems: owned,
    loadout: { ...snapshot.loadout, accessories },
  };
}

const GIFT_FIELDS = {
  top: "top",
  bottom: "bottom",
  hair_acc: "hairAcc",
  hat: "hat",
  earring: "earring",
  glasses: "glasses",
  cheek: "cheek",
  bracelet: "bracelet",
  bag: "bag",
} as const;

/** PUT the pieces from an opened tree box. A top or bottom clears the one-piece outfit. */
export async function wearGiftPieces(
  queryClient: QueryClient,
  pieces: readonly { id: string; slot: string }[],
): Promise<boolean> {
  let current = queryClient.getQueryData<MascotSnapshot | null>(mascotKey);
  if (current == null) {
    current = await queryClient.fetchQuery({ queryKey: mascotKey, queryFn: fetchMascot });
  }
  if (!current) return false;
  const previous = current;
  const loadout = { ...current.loadout };
  for (const piece of pieces) {
    const field = GIFT_FIELDS[piece.slot as keyof typeof GIFT_FIELDS];
    if (field) loadout[field] = piece.id;
  }
  if (loadout.top || loadout.bottom) loadout.outfit = { ...loadout.outfit, id: "" };
  const next = { ...current, loadout };
  queryClient.setQueryData(mascotKey, next);
  try {
    await apiPut("/api/v1/me/mascot/loadout", loadoutBody(loadout, null), wearCall);
  } catch (err) {
    queryClient.setQueryData(mascotKey, previous);
    throw err;
  }
  await queryClient.invalidateQueries({ queryKey: mascotKey });
  return true;
}

function loadoutBody(loadout: MascotLoadout, clipId: string | null) {
  const kept = loadout.accessories.map((item) => item.id).filter((id) => !isTreeWearClip(id));
  const accessories = clipId ? [...kept.filter((id) => id !== clipId), clipId] : kept;
  return {
    body: loadout.body.id,
    hair: loadout.hair.id,
    outfit: loadout.top || loadout.bottom ? "" : loadout.outfit.id,
    top: loadout.top ?? "",
    bottom: loadout.bottom ?? "",
    hair_acc: loadout.hairAcc ?? "",
    hat: loadout.hat ?? "",
    earring: loadout.earring ?? "",
    glasses: loadout.glasses ?? "",
    cheek: loadout.cheek ?? "",
    bracelet: loadout.bracelet ?? "",
    bag: loadout.bag ?? "",
    accessory: clipId ?? accessories[0] ?? "",
    accessories,
    room_items: loadout.roomItems.map((item) => item.id),
  };
}
