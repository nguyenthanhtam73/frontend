import { recordPushClick } from "@/lib/api/push";
import { getAccessToken } from "@/lib/auth-token";
import {
  coercePushClickRecord,
  readPushClickMessage,
  type PushClickRecord,
} from "@/lib/push/click-record";
import { listQueuedPushClicks, removeQueuedPushClick } from "@/lib/push/click-queue";

const inflight = new Set<string>();

/**
 * Send one click when an access token exists. Removes the IndexedDB row only
 * after a 2xx (including the duplicate-key 200). Guests and failures stay queued.
 */
export async function relayPushClick(click: PushClickRecord): Promise<void> {
  try {
    if (!getAccessToken()) return;
    const key = click.idempotency_key.trim();
    if (!key || inflight.has(key)) return;
    inflight.add(key);
    try {
      const result = await recordPushClick(click);
      if (result) await removeQueuedPushClick(key);
    } finally {
      inflight.delete(key);
    }
  } catch {
    // best-effort; never surface click tracking in the UI
  }
}

/** Drain clicks the service worker queued. No-op without an access token. */
export async function drainQueuedPushClicks(): Promise<void> {
  if (!getAccessToken()) return;
  try {
    const rows = await listQueuedPushClicks();
    for (const row of rows) {
      const click = coercePushClickRecord(row);
      if (!click) continue;
      await relayPushClick(click);
    }
  } catch {
    // silent
  }
}

export function relayPushClickMessage(data: unknown): void {
  const click = readPushClickMessage(data);
  if (!click) return;
  void relayPushClick(click);
}
