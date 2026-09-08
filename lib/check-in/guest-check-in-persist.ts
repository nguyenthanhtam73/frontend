import { FUNNEL_EVENTS, trackFunnelEvent } from "@/lib/analytics/funnel";

/** Matches check-in upload slots (front + optional angle). */
const MAX_GUEST_CHECKIN_PHOTOS = 2;

/** One local guest check-in on this device (no claimed history). */
export const GUEST_CHECKIN_PERSIST_KEY = "dadiary_guest_checkin_v1";

const GUEST_CHECKIN_TTL_MS = 14 * 24 * 60 * 60 * 1000;

const PHOTO_DB_NAME = "dadiary_guest_checkin_photos_v1";
const PHOTO_DB_VERSION = 1;
const PHOTO_STORE = "photos";
const PHOTO_RECORD_KEY = "checkin";

export type GuestCheckInPayload = {
  skipMode: boolean;
  title: string;
  userNote: string;
  environmentNote: string;
  conditions: string[];
  symptoms: string[];
  skillMode: string | null;
  locale: string;
  hasPhotos: boolean;
};

type PersistedGuestCheckIn = {
  savedAt: number;
  payload: GuestCheckInPayload;
};

type StoredPhoto = {
  name: string;
  type: string;
  buffer: ArrayBuffer;
};

type StoredPhotoRecord = {
  photos: StoredPhoto[];
  savedAt: number;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string");
}

/** True when this device has no local guest check-in yet. */
export function canWriteGuestCheckIn(
  existing: GuestCheckInPayload | null,
): boolean {
  return existing == null;
}

export function parseGuestCheckInRecord(
  raw: unknown,
  now = Date.now(),
): GuestCheckInPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Partial<PersistedGuestCheckIn>;
  if (!Number.isFinite(rec.savedAt)) return null;
  if (now - Number(rec.savedAt) > GUEST_CHECKIN_TTL_MS) return null;
  const p = rec.payload;
  if (!p || typeof p !== "object") return null;
  if (typeof p.skipMode !== "boolean") return null;
  if (typeof p.hasPhotos !== "boolean") return null;
  return {
    skipMode: p.skipMode,
    title: typeof p.title === "string" ? p.title : "",
    userNote: typeof p.userNote === "string" ? p.userNote : "",
    environmentNote: typeof p.environmentNote === "string" ? p.environmentNote : "",
    conditions: asStringArray(p.conditions),
    symptoms: asStringArray(p.symptoms),
    skillMode: typeof p.skillMode === "string" ? p.skillMode : null,
    locale: typeof p.locale === "string" ? p.locale : "",
    hasPhotos: p.hasPhotos,
  };
}

export function persistGuestCheckInRecord(payload: GuestCheckInPayload): void {
  if (typeof window === "undefined") return;
  try {
    const record: PersistedGuestCheckIn = {
      savedAt: Date.now(),
      payload,
    };
    window.localStorage.setItem(GUEST_CHECKIN_PERSIST_KEY, JSON.stringify(record));
  } catch {
    /* private mode / quota */
  }
}

export function readPersistedGuestCheckIn(): GuestCheckInPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(GUEST_CHECKIN_PERSIST_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const payload = parseGuestCheckInRecord(parsed);
    if (!payload) {
      window.localStorage.removeItem(GUEST_CHECKIN_PERSIST_KEY);
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function clearPersistedGuestCheckIn(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(GUEST_CHECKIN_PERSIST_KEY);
  } catch {
    /* ignore */
  }
}

export function hasPersistedGuestCheckIn(): boolean {
  return readPersistedGuestCheckIn() != null;
}

function openPhotoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(PHOTO_DB_NAME, PHOTO_DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("idb open failed"));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        db.createObjectStore(PHOTO_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

async function idbPutPhotos(record: StoredPhotoRecord): Promise<void> {
  const db = await openPhotoDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("idb put failed"));
      tx.objectStore(PHOTO_STORE).put(record, PHOTO_RECORD_KEY);
    });
  } finally {
    db.close();
  }
}

async function idbGetPhotos(): Promise<StoredPhotoRecord | null> {
  const db = await openPhotoDb();
  try {
    return await new Promise<StoredPhotoRecord | null>((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE, "readonly");
      tx.onerror = () => reject(tx.error ?? new Error("idb get failed"));
      const req = tx.objectStore(PHOTO_STORE).get(PHOTO_RECORD_KEY);
      req.onsuccess = () => {
        const v = req.result as StoredPhotoRecord | undefined;
        resolve(v?.photos?.length ? v : null);
      };
    });
  } finally {
    db.close();
  }
}

async function idbDeletePhotos(): Promise<void> {
  const db = await openPhotoDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PHOTO_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("idb delete failed"));
      tx.objectStore(PHOTO_STORE).delete(PHOTO_RECORD_KEY);
    });
  } finally {
    db.close();
  }
}

export async function saveGuestCheckInPhotos(files: File[]): Promise<number> {
  const slice = files.slice(0, MAX_GUEST_CHECKIN_PHOTOS);
  if (!slice.length) {
    await clearGuestCheckInPhotos();
    return 0;
  }
  const stored: StoredPhoto[] = [];
  for (const file of slice) {
    stored.push({
      name: file.name || "guest-checkin.jpg",
      type: file.type || "image/jpeg",
      buffer: await file.arrayBuffer(),
    });
  }
  await idbPutPhotos({ photos: stored, savedAt: Date.now() });
  return stored.length;
}

export async function loadGuestCheckInPhotos(): Promise<File[]> {
  try {
    const record = await idbGetPhotos();
    if (!record?.photos?.length) return [];
    return record.photos.slice(0, MAX_GUEST_CHECKIN_PHOTOS).map((p, i) => {
      return new File([p.buffer], p.name || `guest-checkin-${i + 1}.jpg`, {
        type: p.type || "image/jpeg",
      });
    });
  } catch {
    return [];
  }
}

export async function clearGuestCheckInPhotos(): Promise<void> {
  try {
    await idbDeletePhotos();
  } catch {
    /* ignore */
  }
}

export type SaveLocalGuestCheckInResult = "ok" | "already_saved" | "failed";

function trackGuestCheckInSave(input: {
  skipMode: boolean;
  hasPhotos: boolean;
  result: SaveLocalGuestCheckInResult;
}): SaveLocalGuestCheckInResult {
  trackFunnelEvent(FUNNEL_EVENTS.guestCheckInSave, {
    skip_mode: input.skipMode,
    has_photos: input.hasPhotos,
    result: input.result,
  });
  return input.result;
}

/**
 * Persist one local guest check-in. Photos live in IndexedDB; metadata in
 * localStorage. Does not call the API (no server skin-check id until claim).
 */
export async function saveLocalGuestCheckIn(input: {
  payload: Omit<GuestCheckInPayload, "hasPhotos">;
  files: File[];
  replace?: boolean;
}): Promise<SaveLocalGuestCheckInResult> {
  if (typeof window === "undefined") {
    return trackGuestCheckInSave({
      skipMode: input.payload.skipMode,
      hasPhotos: input.files.length > 0,
      result: "failed",
    });
  }
  const existing = readPersistedGuestCheckIn();
  if (!input.replace && !canWriteGuestCheckIn(existing)) {
    return trackGuestCheckInSave({
      skipMode: input.payload.skipMode,
      hasPhotos: existing?.hasPhotos ?? input.files.length > 0,
      result: "already_saved",
    });
  }

  const files = input.files.slice(0, MAX_GUEST_CHECKIN_PHOTOS);
  let hasPhotos = false;
  try {
    if (files.length > 0) {
      const n = await saveGuestCheckInPhotos(files);
      hasPhotos = n > 0;
      if (!hasPhotos && !input.payload.skipMode) {
        return trackGuestCheckInSave({
          skipMode: input.payload.skipMode,
          hasPhotos: false,
          result: "failed",
        });
      }
    } else {
      await clearGuestCheckInPhotos();
    }
  } catch {
    return trackGuestCheckInSave({
      skipMode: input.payload.skipMode,
      hasPhotos: false,
      result: "failed",
    });
  }

  persistGuestCheckInRecord({ ...input.payload, hasPhotos });
  if (!readPersistedGuestCheckIn()) {
    return trackGuestCheckInSave({
      skipMode: input.payload.skipMode,
      hasPhotos,
      result: "failed",
    });
  }
  return trackGuestCheckInSave({
    skipMode: input.payload.skipMode,
    hasPhotos,
    result: "ok",
  });
}

export async function clearLocalGuestCheckIn(): Promise<void> {
  clearPersistedGuestCheckIn();
  await clearGuestCheckInPhotos();
}
