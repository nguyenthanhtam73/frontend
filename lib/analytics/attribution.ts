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

/** Cap every stored click id and UTM value. */
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
