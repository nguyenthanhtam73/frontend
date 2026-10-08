/**
 * Push notification click record sent to POST /api/v1/me/push/click.
 * The service worker builds the same shape inline in `public/sw.js`
 * (it cannot import this module). Keep the idempotency formula in sync.
 */
export type PushClickRecord = {
  kind: string;
  tag: string;
  idempotency_key: string;
  clicked_at: string;
};

export type PushClickSource = {
  /** `notification.data.type` */
  type?: unknown;
  /** `notification.tag` */
  tag?: unknown;
  /** `notification.timestamp` (ms). Falsy values fall through to `now`. */
  timestamp?: unknown;
  /** Clock used when `timestamp` is missing. Defaults to `Date.now()`. */
  now?: number;
  /** RFC3339 click time. Defaults to `new Date(now).toISOString()`. */
  clickedAt?: string;
};

/**
 * `${tag || kind || "push"}-${timestamp || now}`
 * Matches the service-worker click handler.
 */
export function buildPushClickRecord(source: PushClickSource = {}): PushClickRecord {
  const kind = typeof source.type === "string" ? source.type : "";
  const tag = typeof source.tag === "string" ? source.tag : "";
  const now = source.now ?? Date.now();
  const timestamp =
    typeof source.timestamp === "number" && source.timestamp ? source.timestamp : now;
  const prefix = tag || kind || "push";
  return {
    kind,
    tag,
    idempotency_key: `${prefix}-${timestamp}`,
    clicked_at: source.clickedAt ?? new Date(now).toISOString(),
  };
}

export function coercePushClickRecord(value: unknown): PushClickRecord | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const kind = typeof raw.kind === "string" ? raw.kind : "";
  const tag = typeof raw.tag === "string" ? raw.tag : "";
  const idempotencyKey =
    typeof raw.idempotency_key === "string" ? raw.idempotency_key.trim() : "";
  const clickedAt = typeof raw.clicked_at === "string" ? raw.clicked_at.trim() : "";
  if (!idempotencyKey || !clickedAt) return null;
  return {
    kind,
    tag,
    idempotency_key: idempotencyKey,
    clicked_at: clickedAt,
  };
}

/** Page-side parse of a service-worker `DADIARY_PUSH_CLICK` message. */
export function readPushClickMessage(data: unknown): PushClickRecord | null {
  if (!data || typeof data !== "object") return null;
  if ((data as { type?: unknown }).type !== "DADIARY_PUSH_CLICK") return null;
  return coercePushClickRecord((data as { click?: unknown }).click);
}
