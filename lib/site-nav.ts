/** Path helpers shared by header + footer chrome. */

export function normalizePath(path: string) {
  const trimmed = path.split("?")[0].replace(/\/$/, "");
  return trimmed === "" ? "/" : trimmed;
}

const LOCALE_PREFIX = /^\/en(?=\/|$)/;

/** Strip optional `/en` so funnel checks work with locale-prefixed URLs. */
function appPath(pathname: string) {
  const bare = normalizePath(pathname);
  if (bare === "/en") return "/";
  if (LOCALE_PREFIX.test(bare)) return bare.replace(LOCALE_PREFIX, "") || "/";
  return bare;
}

/**
 * Guest photo → starter routine → signup screens.
 * Install banners here compete with the save/register CTA.
 */
export function isOnboardingFunnelPath(pathname: string) {
  const p = appPath(pathname);
  return (
    p === "/onboarding" ||
    p.startsWith("/onboarding/") ||
    p === "/login" ||
    p === "/register"
  );
}

/** Marketing surfaces where guests see the short funnel nav. */
export function isMarketingPath(pathname: string) {
  const p = normalizePath(pathname);
  return (
    p === "/" ||
    p === "/pricing" ||
    p === "/guides" ||
    p.startsWith("/guides/") ||
    p === "/login" ||
    p === "/register" ||
    p.startsWith("/payment") ||
    p.startsWith("/share")
  );
}

/** Routes with a sticky/fixed bar at the bottom of the phone viewport. */
export function hasMobileBottomChrome(pathname: string) {
  const p = appPath(pathname);
  return (
    p === "/pricing" ||
    p === "/check-in" ||
    p === "/routine" ||
    p === "/onboarding/coach-welcome"
  );
}
