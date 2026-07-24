export const AUTH_TOKEN_STORAGE_KEY = "dadiary_access_token";
export const AUTH_REFRESH_STORAGE_KEY = "dadiary_refresh_token";

/** Fired on same-document login/logout after localStorage token changes. */
export const AUTH_CHANGED_EVENT = "dadiary-auth-changed";

function emitAuthChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
}

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage blocked/full */
  }
}

function safeRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(key);
  } catch {
    /* nothing we can do if storage is unavailable */
  }
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

/** Persist both tokens after login / register / refresh. */
export function setAuthTokens(
  accessToken: string,
  refreshToken?: string | null,
  opts?: { emit?: boolean },
): void {
  if (typeof window === "undefined") return;
  safeSet(AUTH_TOKEN_STORAGE_KEY, accessToken);
  if (refreshToken) {
    safeSet(AUTH_REFRESH_STORAGE_KEY, refreshToken);
  }
  // Silent write on token rotation — avoids same-tab AUTH_CHANGED → /me storms.
  // Other tabs still learn via the native `storage` event.
  if (opts?.emit !== false) {
    emitAuthChanged();
  }
}

/** @deprecated Prefer setAuthTokens — kept for call sites that only have access. */
export function setAccessToken(token: string): void {
  setAuthTokens(token);
}

/**
 * Returns the stored access token (even if expired — caller / api-client should
 * refresh). Returns null when missing. Clears storage when the leftover token
 * is expired AND there is no refresh token to renew with.
 */
export function getAccessToken(): string | null {
  const token = safeGet(AUTH_TOKEN_STORAGE_KEY);
  if (!token) return null;
  if (isTokenExpired(token) && !getRefreshToken()) {
    clearAccessToken();
    return null;
  }
  return token;
}

export function getRefreshToken(): string | null {
  return safeGet(AUTH_REFRESH_STORAGE_KEY);
}

export function clearAccessToken(): void {
  if (typeof window === "undefined") return;
  safeRemove(AUTH_TOKEN_STORAGE_KEY);
  safeRemove(AUTH_REFRESH_STORAGE_KEY);
  emitAuthChanged();
}

export function authHeaders(): HeadersInit {
  const t = getAccessToken();
  const h: Record<string, string> = { Accept: "application/json" };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

type RefreshEnvelope = {
  success?: boolean;
  data?: {
    tokens?: {
      access_token?: string;
      refresh_token?: string;
    };
  };
};

let refreshInflight: Promise<boolean> | null = null;

/**
 * Exchange refresh_token for a new access (+ rotated refresh). Returns true on
 * success. Concurrent callers share one in-flight request.
 */
export async function refreshAccessToken(apiBase: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (refreshInflight) return refreshInflight;

  refreshInflight = (async () => {
    const refresh = getRefreshToken();
    if (!refresh) return false;
    try {
      const res = await fetch(`${apiBase.replace(/\/$/, "")}/api/v1/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ refresh_token: refresh }),
      });
      const json = (await res.json().catch(() => ({}))) as RefreshEnvelope;
      const access = json.data?.tokens?.access_token;
      const nextRefresh = json.data?.tokens?.refresh_token;
      if (!res.ok || !access) {
        // Only wipe if this tab still holds the refresh we just tried.
        // Another tab may have already rotated to a newer token in localStorage.
        if (getRefreshToken() === refresh) {
          clearAccessToken();
        }
        return false;
      }
      setAuthTokens(access, nextRefresh ?? refresh, { emit: false });
      return true;
    } catch {
      // Network blip — do NOT clear tokens; caller keeps prior session.
      return false;
    } finally {
      refreshInflight = null;
    }
  })();

  return refreshInflight;
}

/**
 * Ensure we have a non-expired access token when a refresh token is available.
 * No-op when already fresh or when there is nothing to refresh with.
 */
export async function ensureFreshAccessToken(apiBase: string): Promise<string | null> {
  const access = getAccessToken();
  if (access && !isTokenExpired(access)) return access;
  if (!getRefreshToken()) return access;
  const ok = await refreshAccessToken(apiBase);
  return ok ? getAccessToken() : null;
}
