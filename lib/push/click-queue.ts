import type { PushClickRecord } from "@/lib/push/click-record";
import { coercePushClickRecord } from "@/lib/push/click-record";

/**
 * Same database the service worker writes in `public/sw.js`.
 * Keep the name, store, version, cap, and TTL in sync with that file.
 */
export const PUSH_CLICK_DB_NAME = "dadiary-push-clicks";
export const PUSH_CLICK_STORE = "clicks";
export const PUSH_CLICK_DB_VERSION = 1;
export const PUSH_CLICK_QUEUE_MAX = 20;
export const PUSH_CLICK_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type QueuedPushClick = PushClickRecord & { queued_at: number };

function openPushClickDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(PUSH_CLICK_DB_NAME, PUSH_CLICK_DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("idb open failed"));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PUSH_CLICK_STORE)) {
        db.createObjectStore(PUSH_CLICK_STORE, { keyPath: "idempotency_key" });
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

function readQueuedRow(value: unknown): QueuedPushClick | null {
  const click = coercePushClickRecord(value);
  if (!click || !value || typeof value !== "object") return null;
  const queuedAt = (value as { queued_at?: unknown }).queued_at;
  if (typeof queuedAt !== "number" || !Number.isFinite(queuedAt)) return null;
  return { ...click, queued_at: queuedAt };
}

/** Queued clicks that are still inside the 7-day window. Stale rows are removed. */
export async function listQueuedPushClicks(now = Date.now()): Promise<QueuedPushClick[]> {
  if (typeof indexedDB === "undefined") return [];
  let rows: unknown[] = [];
  try {
    const db = await openPushClickDb();
    try {
      rows = await new Promise<unknown[]>((resolve, reject) => {
        const tx = db.transaction(PUSH_CLICK_STORE, "readonly");
        const req = tx.objectStore(PUSH_CLICK_STORE).getAll();
        req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
        req.onerror = () => reject(req.error ?? new Error("idb getAll failed"));
      });
    } finally {
      db.close();
    }
  } catch {
    return [];
  }

  const fresh: QueuedPushClick[] = [];
  const staleKeys: string[] = [];
  for (const row of rows) {
    const parsed = readQueuedRow(row);
    if (!parsed) {
      const key = (row as { idempotency_key?: unknown } | null)?.idempotency_key;
      if (typeof key === "string" && key) staleKeys.push(key);
      continue;
    }
    if (now - parsed.queued_at > PUSH_CLICK_TTL_MS) {
      staleKeys.push(parsed.idempotency_key);
      continue;
    }
    fresh.push(parsed);
  }
  fresh.sort((a, b) => a.queued_at - b.queued_at);
  if (fresh.length > PUSH_CLICK_QUEUE_MAX) {
    const excess = fresh.splice(0, fresh.length - PUSH_CLICK_QUEUE_MAX);
    for (const row of excess) staleKeys.push(row.idempotency_key);
  }
  await Promise.all(staleKeys.map((key) => removeQueuedPushClick(key)));
  return fresh;
}

export async function removeQueuedPushClick(idempotencyKey: string): Promise<void> {
  const key = idempotencyKey.trim();
  if (!key || typeof indexedDB === "undefined") return;
  let db: IDBDatabase;
  try {
    db = await openPushClickDb();
  } catch {
    return;
  }
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PUSH_CLICK_STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("idb delete failed"));
      tx.onabort = () => reject(tx.error ?? new Error("idb delete aborted"));
      tx.objectStore(PUSH_CLICK_STORE).delete(key);
    });
  } catch {
    // best-effort; a later drain retries
  } finally {
    db.close();
  }
}
