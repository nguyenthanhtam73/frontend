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

/**
 * Conversion funnel where marketing header/footer chips steal focus
 * (especially ~390px). Includes check-in plus the onboarding/auth funnel.
 */
export function hidesFunnelMarketingNav(pathname: string) {
  const p = appPath(pathname);
  return isOnboardingFunnelPath(pathname) || p === "/check-in";
}

/** Login/register only — the wizard itself can still show a first-check-in CTA. */
export function isAuthEntryPath(pathname: string) {
  const p = appPath(pathname);
  return p === "/login" || p === "/register";
}

/**
 * Conversion-critical screens where the install banner collides with CTAs
 * or the sticky billing bar. Update toasts still show.
 */
export function hidesPwaInstallBanner(pathname: string) {
  const p = appPath(pathname);
  return hidesFunnelMarketingNav(pathname) || p === "/pricing";
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
    p === "/privacy" ||
    p === "/terms" ||
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
