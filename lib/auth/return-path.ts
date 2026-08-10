/**
 * Safe in-app return path for login/register `?next=` (open-redirect safe).
 */

const ALLOWED_PREFIXES = [
  "/check-in",
  "/onboarding",
  "/routine",
  "/progress",
  "/cabinet",
  "/pricing",
  "/settings",
  "/feedback",
  "/privacy",
] as const;

/** Normalize and allow only same-origin app paths (relative only). */
export function sanitizeAuthReturnPath(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const path = raw.trim();
  // Reject absolute / protocol-relative URLs (open redirect).
  if (
    path.startsWith("http://") ||
    path.startsWith("https://") ||
    path.startsWith("//") ||
    path.includes("://")
  ) {
    return null;
  }
  if (!path.startsWith("/")) return null;
  const bare = path.split("?")[0]?.split("#")[0] || path;
  const ok = ALLOWED_PREFIXES.some(
    (p) => bare === p || bare.startsWith(`${p}/`),
  );
  return ok ? path : null;
}

export function readAuthReturnPathFromSearch(
  searchParams: { get: (key: string) => string | null },
): string | null {
  return (
    sanitizeAuthReturnPath(searchParams.get("next")) ||
    sanitizeAuthReturnPath(searchParams.get("returnUrl"))
  );
}

/** `/register?next=/check-in` (and optional login twin). */
export function buildAuthHrefWithNext(
  authPath: "/login" | "/register",
  nextPath: string,
): string {
  const safe = sanitizeAuthReturnPath(nextPath) ?? "/check-in";
  const q = new URLSearchParams({ next: safe });
  return `${authPath}?${q.toString()}`;
}
