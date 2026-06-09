export const AUTH_TOKEN_STORAGE_KEY = "dadiary_access_token";

/** Fired on same-document login/logout after localStorage token changes. */
export const AUTH_CHANGED_EVENT = "dadiary-auth-changed";

function emitAuthChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
}

/** Persists JWT access token for Authorization: Bearer (demo/local UX). */
export function setAccessToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  emitAuthChanged();
}

/**
 * Decodes a JWT `exp` (seconds since epoch). Returns null when the token is
 * malformed or has no exp claim. Best-effort, never throws.
 */
function readJwtExpiryMs(token: string): number | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = JSON.parse(atob(padded)) as { exp?: number };
    if (typeof json.exp !== "number") return null;
    return json.exp * 1000;
  } catch {
    return null;
  }
}

/** True when the JWT carries an `exp` claim that is already in the past. */
export function isTokenExpired(token: string): boolean {
  const expMs = readJwtExpiryMs(token);
  if (expMs === null) return false;
  return Date.now() >= expMs;
}

/**
 * Returns the stored access token, or null when there is none OR when a
 * leftover token has already expired. The app has no refresh flow, so an
 * expired token is useless — treating it as null keeps "logged out" users
 * (e.g. guests with a stale token) on the guest path instead of routing them
 * into authenticated requests that would hang or 401.
 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
  if (!token) return null;
  if (isTokenExpired(token)) return null;
  return token;
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  emitAuthChanged();
}

export function authHeaders(): HeadersInit {
  const t = getAccessToken();
  const h: Record<string, string> = { Accept: "application/json" };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}
