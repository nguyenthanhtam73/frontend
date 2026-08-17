import { normalizePath } from "@/lib/site-nav";

const LOCALE_PREFIX = /^\/en(?=\/|$)/;

/** Strip optional `/en` prefix so `/routine` and `/en/routine` compare equal. */
export function appPathKey(pathname: string): string {
  const bare = normalizePath(pathname.split("?")[0]?.split("#")[0] ?? pathname);
  if (bare === "/en") return "/";
  if (LOCALE_PREFIX.test(bare)) return bare.replace(LOCALE_PREFIX, "") || "/";
  return bare;
}

/** True when both paths refer to the same in-app route (ignoring locale + hash + query). */
export function isSameAppRoute(currentPath: string, targetPath: string): boolean {
  return appPathKey(currentPath) === appPathKey(targetPath);
}

/** Resolve an anchor href to a same-origin pathname (or null when external). */
export function resolveInternalPathname(href: string, origin: string): string | null {
  try {
    const url = new URL(href, origin);
    if (url.origin !== origin) return null;
    return url.pathname;
  } catch {
    return null;
  }
}
