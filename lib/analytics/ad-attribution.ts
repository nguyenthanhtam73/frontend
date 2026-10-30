/**
 * Ad click params from the landing URL, kept in localStorage for 30 days.
 *
 * `POST /api/v1/auth/register` sends them on `attribution`, matching
 * `dto.RegisterRequest` / `dto.RegisterAttribution` on backend `main`
 * (`internal/dto/auth.go`, added in nguyenthanhtam73/backend PR #24).
 * Length and format follow `internal/dto/attribution.go`:
 * UTM text is capped at 100 runes and a value containing `@` is omitted;
 * `fbclid` matches `^[A-Za-z0-9_.-]{1,256}$`; `ttclid` matches
 * `^[A-Za-z0-9_.-]{1,255}$`. `utm_term` is stored here but is not a
 * register field, so the request omits it.
 */

export const AD_ATTRIBUTION_STORAGE_KEY = "dadiary_ad_attribution_v1";

export const AD_ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Query keys captured from the landing URL. */
export const AD_ATTRIBUTION_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "ttclid",
] as const;

/**
 * JSON keys on `attribution` in the register body.
 * Source: `RegisterAttribution` in backend `internal/dto/auth.go`.
 */
export const REGISTER_ATTRIBUTION_FIELDS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "fbclid",
  "ttclid",
] as const;

/** `maxUTMRunes` in backend `internal/dto/attribution.go`. */
export const UTM_MAX_RUNES = 100;

/** `fbclid` column is VARCHAR(256); the pattern allows at most 256. */
export const FBCLID_MAX_LENGTH = 256;

/** `ttclid` column is VARCHAR(255); the pattern allows at most 255. */
export const TTCLID_MAX_LENGTH = 255;

const CLICK_ID_PATTERN = /^[A-Za-z0-9_.-]+$/;

const UTM_PUNCTUATION = new Set(
  [".", "_", "-", ",", ":", ";", "'", '"', "/", "(", ")", "[", "]", "!", "?", "&", "=", "~", "#", "|", "+"],
);

export type AdAttributionParam = (typeof AD_ATTRIBUTION_PARAMS)[number];

export type AdAttribution = Partial<Record<AdAttributionParam, string>>;

export type RegisterAttributionField = (typeof REGISTER_ATTRIBUTION_FIELDS)[number];

/** Body of `attribution` on `POST /api/v1/auth/register`. Empty fields are omitted. */
export type RegisterAttribution = Partial<Record<RegisterAttributionField, string>>;

type StoredAttribution = {
  savedAt: number;
  values: AdAttribution;
};

type KeyValueStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function storageOrNull(): KeyValueStorage | null {
  try {
    if (typeof window === "undefined") return null;
    const storage = window.localStorage;
    if (
      !storage ||
      typeof storage.getItem !== "function" ||
      typeof storage.setItem !== "function"
    ) {
      return null;
    }
    return storage;
  } catch {
    return null;
  }
}

function removeStored(storage: KeyValueStorage): void {
  try {
    storage.removeItem(AD_ATTRIBUTION_STORAGE_KEY);
  } catch {
    /* private mode */
  }
}

function paramsFromSearch(search: string): AdAttribution {
  const raw = search.trim();
  if (!raw) return {};
  const query = raw.startsWith("?") ? raw.slice(1) : raw;
  const params = new URLSearchParams(query);
  const incoming: AdAttribution = {};
  for (const key of AD_ATTRIBUTION_PARAMS) {
    const values = params.getAll(key);
    let chosen = "";
    for (const value of values) {
      const trimmed = value.trim();
      if (trimmed) chosen = trimmed;
    }
    if (chosen) incoming[key] = chosen;
  }
  return incoming;
}

function valuesFromUnknown(input: unknown): AdAttribution {
  if (!input || typeof input !== "object") return {};
  const record = input as Record<string, unknown>;
  const values: AdAttribution = {};
  for (const key of AD_ATTRIBUTION_PARAMS) {
    const value = record[key];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    values[key] = trimmed;
  }
  return values;
}

function readRecord(now: number): StoredAttribution | null {
  const storage = storageOrNull();
  if (!storage) return null;
  let raw: string | null;
  try {
    raw = storage.getItem(AD_ATTRIBUTION_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    removeStored(storage);
    return null;
  }
  if (!parsed || typeof parsed !== "object") {
    removeStored(storage);
    return null;
  }
  const savedAt = (parsed as { savedAt?: unknown }).savedAt;
  if (typeof savedAt !== "number" || !Number.isFinite(savedAt)) {
    removeStored(storage);
    return null;
  }
  if (now - savedAt >= AD_ATTRIBUTION_TTL_MS) {
    removeStored(storage);
    return null;
  }
  return {
    savedAt,
    values: valuesFromUnknown((parsed as { values?: unknown }).values),
  };
}

/**
 * Merge this landing's non-empty ad params into the stored set.
 * A non-empty value replaces that field (last click). A missing or blank
 * value leaves the stored field in place. A landing with no ad params
 * does not write. Expired storage is not merged.
 * No-ops during SSR and when storage throws.
 */
export function captureAdAttribution(search: string, now = Date.now()): void {
  try {
    const incoming = paramsFromSearch(search);
    if (Object.keys(incoming).length === 0) return;
    const storage = storageOrNull();
    if (!storage) return;
    const existing = readRecord(now);
    const values: AdAttribution = { ...existing?.values, ...incoming };
    const record: StoredAttribution = { savedAt: now, values };
    storage.setItem(AD_ATTRIBUTION_STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* private mode, quota, or a storage getter that throws */
  }
}

/** Stored ad params, or `{}` when missing, expired, or storage is unavailable. */
export function readStoredAdAttribution(now = Date.now()): AdAttribution {
  try {
    return readRecord(now)?.values ?? {};
  } catch {
    return {};
  }
}

function stripControlChars(value: string): string {
  let out = "";
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x1f || (code >= 0x7f && code <= 0x9f)) continue;
    out += char;
  }
  return out;
}

function isAllowedUtmRune(char: string): boolean {
  if (/^\p{L}$/u.test(char) || /^\p{Nd}$/u.test(char) || /^\p{White_Space}$/u.test(char)) {
    return true;
  }
  return UTM_PUNCTUATION.has(char);
}

function truncateRunes(value: string, max: number): string {
  const runes = Array.from(value);
  if (runes.length <= max) return value;
  return runes.slice(0, max).join("");
}

/** UTM value the register API will keep, or "" when it must be omitted. */
function cleanUtmForRegister(raw: string): string {
  let value = stripControlChars(raw).trim();
  if (!value || value.includes("@")) return "";
  for (const char of value) {
    if (!isAllowedUtmRune(char)) return "";
  }
  value = truncateRunes(value, UTM_MAX_RUNES).trim();
  if (!value || value.includes("@")) return "";
  return value;
}

function cleanClickId(raw: string, max: number): string {
  const clipped = raw.trim().slice(0, max);
  if (!clipped || !CLICK_ID_PATTERN.test(clipped)) return "";
  return clipped;
}

/**
 * `attribution` object for the register body. Empty and rejected values
 * are omitted. Returns undefined when nothing would be sent.
 */
export function buildRegisterAttribution(
  stored: AdAttribution | null | undefined,
): RegisterAttribution | undefined {
  if (!stored) return undefined;
  const attribution: RegisterAttribution = {};
  for (const field of REGISTER_ATTRIBUTION_FIELDS) {
    const raw = stored[field];
    if (typeof raw !== "string") continue;
    const cleaned =
      field === "fbclid"
        ? cleanClickId(raw, FBCLID_MAX_LENGTH)
        : field === "ttclid"
          ? cleanClickId(raw, TTCLID_MAX_LENGTH)
          : cleanUtmForRegister(raw);
    if (!cleaned) continue;
    attribution[field] = cleaned;
  }
  return Object.keys(attribution).length > 0 ? attribution : undefined;
}
