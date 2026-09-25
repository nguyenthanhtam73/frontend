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
 *
 * Guests only — signed-in users keep the app nav (Check-in / Progress /
 * Routine / Cabinet / …) on these same routes. PWA install-banner hiding
 * still uses the path-only form (`signedIn` defaults to false).
 */
export function hidesFunnelMarketingNav(pathname: string, signedIn = false) {
  if (signedIn) return false;
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

/**
 * How far to scroll a horizontal strip so `item` sits fully inside `container`.
 * Positive moves content left (increase scrollLeft). Zero when it already fits.
 * If the item is wider than the padded strip, the start edge is pinned in view.
 */
export function revealScrollDelta(
  container: { left: number; right: number },
  item: { left: number; right: number },
  pad = 12,
): number {
  const overflowLeft = container.left + pad - item.left;
  const overflowRight = item.right - (container.right - pad);
  if (overflowLeft > 0.5 && overflowRight > 0.5) return -overflowLeft;
  if (overflowLeft > 0.5) return -overflowLeft;
  if (overflowRight > 0.5) return overflowRight;
  return 0;
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
