/** Public Meta Pixel ID (override via env if needed). */
export const META_PIXEL_ID =
  process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "1673924784100065";

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & {
      callMethod?: (...args: unknown[]) => void;
      queue?: unknown[];
      loaded?: boolean;
      version?: string;
      push?: (...args: unknown[]) => void;
    };
    _fbq?: Window["fbq"];
  }
}

/** True for `/admin` and `/[locale]/admin…` (locale-prefixed App Router paths). */
export function isMetaPixelAdminPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return /(?:^|\/)admin(?:\/|$)/.test(pathname);
}

/** Fire a standard or custom Meta Pixel event (no-op if Pixel not loaded). */
export function trackMetaEvent(
  event: string,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  if (params) {
    window.fbq?.("track", event, params);
    return;
  }
  window.fbq?.("track", event);
}
