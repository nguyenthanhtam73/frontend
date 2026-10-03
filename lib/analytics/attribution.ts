/**
 * First-touch and last-touch ad attribution.
 *
 * Captured from the landing URL on page load. First-touch is written once and
 * never replaced. Last-touch updates whenever a later URL carries these params.
 * Values are trimmed and length-capped. Nothing else from the query string is stored.
 */

export const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "fbclid",
  "ttclid",
] as const;

export type AttributionKey = (typeof ATTRIBUTION_KEYS)[number];

export type AttributionTouch = Partial<Record<AttributionKey, string>>;

/**
 * First-touch keys copied onto funnel events.
 * `utm_medium` and `ttclid` stay on the register request only.
 */
export const FUNNEL_EVENT_ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_campaign",
  "utm_content",
  "fbclid",
] as const;

export type FunnelEventAttributionKey = (typeof FUNNEL_EVENT_ATTRIBUTION_KEYS)[number];

export type FunnelEventAttributionProps = Partial<Record<FunnelEventAttributionKey, string>>;

/** Cap every stored click id and UTM value. `fbclid` uses this same 256 cap. */
export const ATTRIBUTION_MAX_LEN = 256;

export const FIRST_TOUCH_STORAGE_KEY = "dadiary:attr:first";
export const LAST_TOUCH_STORAGE_KEY = "dadiary:attr:last";

export type AttributionStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function capAttributionValue(value: string): string {
  const trimmed = value.trim().replace(/[\u0000-\u001F\u007F]/g, "");
  if (!trimmed) return "";
  return trimmed.slice(0, ATTRIBUTION_MAX_LEN);
}

export function readAttributionParams(search: string): AttributionTouch | null {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const touch: AttributionTouch = {};
  for (const key of ATTRIBUTION_KEYS) {
    const value = params.get(key);
    if (value == null) continue;
    const capped = capAttributionValue(value);
    if (!capped) continue;
    touch[key] = capped;
  }
  return Object.keys(touch).length > 0 ? touch : null;
}

function parseStoredTouch(raw: string | null): AttributionTouch | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    const touch: AttributionTouch = {};
    for (const key of ATTRIBUTION_KEYS) {
      const value = record[key];
      if (typeof value !== "string") continue;
      const capped = capAttributionValue(value);
      if (!capped) continue;
      touch[key] = capped;
    }
    return Object.keys(touch).length > 0 ? touch : null;
  } catch {
    return null;
  }
}

/**
 * Persist first-touch only when none is stored yet. Always refresh last-touch
 * when the URL has at least one recognized param. A URL with none of them is a no-op.
 */
export function captureAttribution(search: string, storage: AttributionStorage): void {
  const incoming = readAttributionParams(search);
  if (!incoming) return;
  try {
    const existing = parseStoredTouch(storage.getItem(FIRST_TOUCH_STORAGE_KEY));
    if (!existing) {
      storage.setItem(FIRST_TOUCH_STORAGE_KEY, JSON.stringify(incoming));
    }
    storage.setItem(LAST_TOUCH_STORAGE_KEY, JSON.stringify(incoming));
  } catch {
    /* storage blocked or full — registration still works without attribution */
  }
}

export function readFirstTouch(storage: AttributionStorage): AttributionTouch | null {
  try {
    return parseStoredTouch(storage.getItem(FIRST_TOUCH_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function readLastTouch(storage: AttributionStorage): AttributionTouch | null {
  try {
    return parseStoredTouch(storage.getItem(LAST_TOUCH_STORAGE_KEY));
  } catch {
    return null;
  }
}

function browserStorage(): AttributionStorage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Read the current URL and store first/last touch. Safe to call more than once. */
export function capturePageAttribution(): void {
  const storage = browserStorage();
  if (!storage || typeof window === "undefined") return;
  captureAttribution(window.location.search ?? "", storage);
}

export function readPageFirstTouch(): AttributionTouch | null {
  const storage = browserStorage();
  if (!storage) return null;
  return readFirstTouch(storage);
}

/**
 * `utm_source`, `utm_campaign`, `utm_content`, and `fbclid` from first-touch.
 * Whichever of those exist. Other attribution stays off the event.
 * Values are capped at {@link ATTRIBUTION_MAX_LEN} (256), including `fbclid`.
 * Internal spaces and Vietnamese text are kept; email and password are not keys here.
 */
export function funnelEventAttributionProps(
  touch: AttributionTouch | null = readPageFirstTouch(),
): FunnelEventAttributionProps {
  if (!touch) return {};
  const props: FunnelEventAttributionProps = {};
  for (const key of FUNNEL_EVENT_ATTRIBUTION_KEYS) {
    const raw = touch[key];
    if (typeof raw !== "string") continue;
    const value = capAttributionValue(raw);
    if (!value) continue;
    props[key] = value;
  }
  return props;
}
