/** Path helpers shared by header + footer chrome. */

export function normalizePath(path: string) {
  const trimmed = path.split("?")[0].replace(/\/$/, "");
  return trimmed === "" ? "/" : trimmed;
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
  const p = normalizePath(pathname);
  return (
    p === "/pricing" ||
    p === "/check-in" ||
    p === "/routine" ||
    p === "/onboarding/coach-welcome"
  );
}
