import { appPathKey } from "@/lib/navigation/app-path";

/** Trial Bé Da room. English keeps the `/en` prefix; Vietnamese stays unprefixed. */
export function localePath(locale: string, path: string): string {
  const bare = path.startsWith("/") ? path : `/${path}`;
  return locale.toLowerCase().startsWith("en") ? `/en${bare}` : bare;
}

/** True for `/be-da`, `/en/be-da`, and an invite `/be-da/phong/<code>`. */
export function isBeDaGamePath(pathname: string): boolean {
  const key = appPathKey(pathname);
  return key === "/be-da" || key.startsWith("/be-da/phong/");
}
