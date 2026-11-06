/**
 * Framework-free game spec. Safe for a native port to import.
 * Do not add React, Pixi, or Next imports in this folder.
 */
export { lookArt, shellArt } from "@/lib/game/core/art";
export { startShellClock, type ShellClock } from "@/lib/game/core/clock";
export { LARGE_SCREEN_MAX_DPR, LARGE_SCREEN_SHORT_SIDE, MAX_DPR, cappedDpr, rendererResolution } from "@/lib/game/core/dpr";
export { DRAG_PX, PAN_ARM_MS, TAP_MS, arrowGoal, gestureKind, pointerGesture, pointerKind } from "@/lib/game/core/input";
export {
  LOBBY_BOUNDS,
  LOBBY_FOUNTAIN,
  emptyRemoteBook,
  lobbyWalker,
  placeLocal,
  stepLocal,
  stepRemotes,
  type RemoteBook,
} from "@/lib/game/core/movement";
export { normalizeRoomCode, readRoomList, roomEnterLabel, type RoomSummary } from "@/lib/game/core/rooms";
export { GAME_EMBED_PATH, GAME_SESSION_STORAGE_KEY, hasGameSession } from "@/lib/game/core/session";
export type { ShellApi, ShellSceneName, ShellSnapshot, ShellSprite } from "@/lib/game/core/types";
export { applyPinch, easeZoom, panCamera, wheelZoomFactor, type PinchSample } from "@/lib/game/core/zoom";
export {
  WARDROBE_CATALOG,
  equippedGameLook,
  grantedWardrobeItems,
  wardrobeThumbSrc,
  type ClosetAccess,
  type WardrobeGrant,
  type WardrobeItem,
  type WardrobeSlot,
} from "@/lib/game/core/wardrobe";
