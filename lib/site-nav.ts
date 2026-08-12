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
    p === "/login" ||
    p === "/register" ||
    p.startsWith("/payment") ||
    p.startsWith("/share")
  );
}
