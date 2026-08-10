import { ONBOARDING_MAX_PHOTOS } from "@/lib/onboarding/constants";
import type { PhotoItem } from "@/lib/stores/onboarding-store";

const DB_NAME = "dadiary_guest_photos_v1";
const DB_VERSION = 1;
const STORE = "photos";
const RECORD_KEY = "claim";

type StoredPhoto = {
  name: string;
  type: string;
  buffer: ArrayBuffer;
};

type StoredRecord = {
  photos: StoredPhoto[];
  savedAt: number;
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("idb open failed"));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

async function idbPut(record: StoredRecord): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("idb put failed"));
      tx.objectStore(STORE).put(record, RECORD_KEY);
    });
  } finally {
    db.close();
  }
}

async function idbGet(): Promise<StoredRecord | null> {
  const db = await openDb();
  try {
    return await new Promise<StoredRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      tx.onerror = () => reject(tx.error ?? new Error("idb get failed"));
      const req = tx.objectStore(STORE).get(RECORD_KEY);
      req.onsuccess = () => {
        const v = req.result as StoredRecord | undefined;
        resolve(v?.photos?.length ? v : null);
      };
    });
  } finally {
    db.close();
  }
}

async function idbDelete(): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("idb delete failed"));
      tx.objectStore(STORE).delete(RECORD_KEY);
    });
  } finally {
    db.close();
  }
}

async function fileToStored(file: File): Promise<StoredPhoto> {
  const buffer = await file.arrayBuffer();
  return {
    name: file.name || "guest.jpg",
    type: file.type || "image/jpeg",
    buffer,
  };
}

function storedToPhotoItem(stored: StoredPhoto, index: number): PhotoItem {
  const file = new File([stored.buffer], stored.name || `guest-${index + 1}.jpg`, {
    type: stored.type || "image/jpeg",
  });
  return { file, preview: URL.createObjectURL(file) };
}

/** Persist guest face photos outside sessionStorage (avoids 5MB quota + blob revoke). */
export async function saveGuestClaimPhotos(photos: PhotoItem[]): Promise<number> {
  const slice = photos.slice(0, ONBOARDING_MAX_PHOTOS);
  if (!slice.length) {
    await clearGuestClaimPhotos();
    return 0;
  }
  const stored: StoredPhoto[] = [];
  for (const p of slice) {
    stored.push(await fileToStored(p.file));
  }
  await idbPut({ photos: stored, savedAt: Date.now() });
  return stored.length;
}

/** Load guest claim photos as uploadable Files (creates blob: previews — revoke when done). */
export async function loadGuestClaimPhotos(): Promise<PhotoItem[]> {
  try {
    const record = await idbGet();
    if (!record?.photos?.length) return [];
    return record.photos
      .slice(0, ONBOARDING_MAX_PHOTOS)
      .map((p, i) => storedToPhotoItem(p, i));
  } catch {
    return [];
  }
}

export async function clearGuestClaimPhotos(): Promise<void> {
  try {
    await idbDelete();
  } catch {
    /* ignore */
  }
}

export async function guestClaimPhotoCount(): Promise<number> {
  try {
    const record = await idbGet();
    return record?.photos?.length ?? 0;
  } catch {
    return 0;
  }
}

/** Revoke blob: previews created by loadGuestClaimPhotos. */
export function revokeGuestPhotoPreviews(photos: PhotoItem[]): void {
  for (const p of photos) {
    if (p.preview.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(p.preview);
      } catch {
        /* ignore */
      }
    }
  }
}
