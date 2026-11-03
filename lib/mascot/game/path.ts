import { appPathKey } from "@/lib/navigation/app-path";

/** Trial Bé Da room. English keeps the `/en` prefix; Vietnamese stays unprefixed. */
export function localePath(locale: string, path: string): string {
  const bare = path.startsWith("/") ? path : `/${path}`;
  return locale.toLowerCase().startsWith("en") ? `/en${bare}` : bare;
}

/** True for `/be-da` and `/en/be-da`. */
export function isBeDaGamePath(pathname: string): boolean {
  return appPathKey(pathname) === "/be-da";
}
