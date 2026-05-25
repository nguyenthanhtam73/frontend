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

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
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
