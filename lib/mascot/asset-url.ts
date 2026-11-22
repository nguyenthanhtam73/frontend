/**
 * Bé Da files under public/mascot keep their names when the drawing changes.
 * Browsers that cached the previous bytes with `immutable` ignore the new
 * file until the URL changes. `v` is that shared generation. Bump it when
 * art is replaced in place. A per-file content hash, if one was already
 * stored in `v`, moves to `h` so that bust still works.
 *
 * Sheet keys and other cache maps must use `mascotAssetPath` (no query).
 * The query is only for the request.
 */

export const MASCOT_ASSET_VERSION = "3";

/** Revalidate. Do not mark /mascot immutable: the file names are stable. */
export const MASCOT_CACHE_CONTROL = "public, max-age=0, must-revalidate";

export function mascotAssetHeaders(): {
  source: string;
  headers: { key: string; value: string }[];
}[] {
  return [
    {
      source: "/mascot/:path*",
      headers: [{ key: "Cache-Control", value: MASCOT_CACHE_CONTROL }],
    },
  ];
}

/** Path identity. Drops `?v=` / `#` so lookups stay stable when the URL is versioned. */
export function mascotAssetPath(src: string): string {
  const cut = src.search(/[?#]/);
  return cut === -1 ? src : src.slice(0, cut);
}

/**
 * Append `?v=<MASCOT_ASSET_VERSION>` to every `/mascot/...` URL in `value`.
 * Safe to call twice. Leaves `/api/v1/mascot/...` alone.
 * A previous content hash in `v` is kept as `h`.
 */
export function mascotAssetUrl(value: string): string {
  if (!value.includes("/mascot/")) return value;
  return value.replace(
    /(^|["'(=\s])(\/mascot\/[^"'()\s?#]+(?:\?[^"'()\s#]*)?)/g,
    (_full, prefix: string, url: string) => `${prefix}${versionMascotPath(url)}`,
  );
}

/** Spritesheet PNG next to the JSON. Pixi would otherwise request the bare filename. */
export function mascotSheetImageUrl(image: string): string {
  const file = mascotAssetPath(image).split("/").pop() || image;
  return mascotAssetUrl(`/mascot/game/sheets/${file}`);
}

function versionMascotPath(pathAndQuery: string): string {
  const path = mascotAssetPath(pathAndQuery);
  const queryAt = pathAndQuery.indexOf("?");
  const params = new URLSearchParams(queryAt === -1 ? "" : pathAndQuery.slice(queryAt + 1));
  const current = params.get("v");
  if (current && current !== MASCOT_ASSET_VERSION && !params.has("h")) {
    params.set("h", current);
  }
  params.set("v", MASCOT_ASSET_VERSION);
  const h = params.get("h");
  const extras: string[] = [];
  params.forEach((param, key) => {
    if (key === "v" || key === "h") return;
    extras.push(`${encodeURIComponent(key)}=${encodeURIComponent(param)}`);
  });
  const parts = [`v=${encodeURIComponent(MASCOT_ASSET_VERSION)}`];
  if (h) parts.push(`h=${encodeURIComponent(h)}`);
  parts.push(...extras);
  return `${path}?${parts.join("&")}`;
}
