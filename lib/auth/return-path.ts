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
  "/terms",
  "/delete-account",
  "/be-da",
] as const;

/** Invite codes use the room alphabet, so a next path cannot sneak out of the app. */
const ROOM_INVITE_PATH = /^\/be-da\/phong\/[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/;

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

/** `/be-da/phong/CODE` after login or register. Anything else is not an invite. */
export function roomInviteReturnPath(raw: string | null | undefined): string | null {
  const safe = sanitizeAuthReturnPath(raw);
  if (!safe) return null;
  const bare = safe.split("?")[0]?.split("#")[0]?.replace(/\/+$/, "") || "/";
  return ROOM_INVITE_PATH.test(bare) ? safe : null;
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
