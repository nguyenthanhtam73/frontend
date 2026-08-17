import { buildAuthHrefWithNext, sanitizeAuthReturnPath } from "./return-path";

/**
 * Full-page redirect to login with a safe ?next= path (locale-prefixed).
 * Used when a protected API returns 401 mid-session.
 */
export function redirectToLoginWithNext(locale: string, nextPath = "/routine"): void {
  if (typeof window === "undefined") return;
  const safeNext = sanitizeAuthReturnPath(nextPath) ?? "/routine";
  const authPath = buildAuthHrefWithNext("/login", safeNext);
  const prefix = locale === "en" ? "/en" : "";
  window.location.assign(`${prefix}${authPath}`);
}
