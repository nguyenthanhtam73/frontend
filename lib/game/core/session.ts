/** Unprefixed Vietnamese URL. English is `/en/goc-binh-yen/game`. */
export const GAME_EMBED_PATH = "/goc-binh-yen/game";

/**
 * Same key the site already uses after login. A WebView on this origin
 * already has it. Never put the token in the URL.
 */
export const GAME_SESSION_STORAGE_KEY = "dadiary_access_token";

export function hasGameSession(token: string | null | undefined): boolean {
  return typeof token === "string" && token.trim().length > 0;
}
