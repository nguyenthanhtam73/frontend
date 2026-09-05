import type { Metadata } from "next";

import { guidePublicPaths } from "@/lib/guides/catalog";

/**
 * Canonical site origin for absolute OG/Twitter URLs.
 * Prefer NEXT_PUBLIC_APP_URL; fall back to NEXT_PUBLIC_SITE_URL then production.
 */
export function siteOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://dadiary.vn";
  return raw.replace(/\/$/, "");
}

/**
 * Google Search Console + Bing Webmaster verification meta tags.
 * Set env vars after creating properties in each console (HTML tag method).
 */
export function siteVerificationMetadata(): Pick<Metadata, "verification"> {
  const google =
    process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim() ||
    process.env.GOOGLE_SITE_VERIFICATION?.trim();
  const bing =
    process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim() ||
    process.env.BING_SITE_VERIFICATION?.trim();

  if (!google && !bing) return {};

  return {
    verification: {
      ...(google ? { google } : {}),
      ...(bing
        ? {
            other: {
              "msvalidate.01": bing,
            },
          }
        : {}),
    },
  };
}

export const SITE_NAME = "DaDiary";

/** Default Open Graph image (1200×630) — replace `public/og/og-default.png` to rebrand. */
export const DEFAULT_OG_IMAGE = {
  url: "/og/og-default.png",
  width: 1200,
  height: 630,
  alt: "DaDiary — Nhật ký da + AI Coach",
} as const;

export type OgImage = {
  url: string;
  width?: number;
  height?: number;
  alt?: string;
};

/** Path without locale prefix: "" | "/" | "/pricing" | "/share/skin-review/x". */
export function localePath(locale: string, path = ""): string {
  const trimmed = path.trim();
  const clean =
    !trimmed || trimmed === "/"
      ? ""
      : trimmed.startsWith("/")
        ? trimmed
        : `/${trimmed}`;
  if (locale === "en") {
    return clean ? `/en${clean}` : "/en";
  }
  return clean || "/";
}

export function absoluteUrl(locale: string, path = ""): string {
  const p = localePath(locale, path);
  return `${siteOrigin()}${p}`;
}

/**
 * Absolute same-site upload URL for OG crawlers (Facebook/Zalo).
 * Uses `https://dadiary.vn/uploads/...` (Next rewrite → API) instead of the
 * raw Railway/API host, which is uglier and easier for scrapers to miss.
 */
export function absoluteSiteUploadUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    try {
      const u = new URL(path);
      if (u.pathname.startsWith("/uploads/")) {
        return `${siteOrigin()}${u.pathname}${u.search}`;
      }
    } catch {
      /* fall through */
    }
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized.startsWith("/uploads/")) {
    return `${siteOrigin()}${normalized}`;
  }
  return `${siteOrigin()}/uploads/${path.replace(/^\//, "")}`;
}

export function ogLocale(locale: string): "vi_VN" | "en_US" {
  return locale === "en" ? "en_US" : "vi_VN";
}

/** Opposite OG locale for `openGraph.alternateLocale`. */
export function ogAlternateLocale(locale: string): "vi_VN" | "en_US" {
  return locale === "en" ? "vi_VN" : "en_US";
}

/**
 * Canonical + hreflang (vi / en / x-default→vi) for a path without locale prefix.
 * Emits absolute URLs matching `localePrefix: "as-needed"` (vi unprefixed, en under `/en`).
 */
export function localeAlternates(
  locale: string,
  path = "",
): NonNullable<Metadata["alternates"]> {
  return {
    canonical: absoluteUrl(locale, path),
    languages: {
      vi: absoluteUrl("vi", path),
      en: absoluteUrl("en", path),
      "x-default": absoluteUrl("vi", path),
    },
  };
}

type PageMetaInput = {
  title: string;
  description: string;
  locale: string;
  /** Path without locale prefix (e.g. "" for home, "/pricing"). */
  path?: string;
  /**
   * `noindex`. Default `follow: true` (auth, onboarding, feedback, routine, share).
   * Pair with `noFollow` for private app routes.
   */
  noIndex?: boolean;
  /** With `noIndex`: emit `nofollow` (admin, settings, me, payment, wardrobe). */
  noFollow?: boolean;
};

const NO_INDEX_FOLLOW_ROBOTS = {
  index: false,
  follow: true,
  googleBot: { index: false, follow: true },
} as const;

const NO_INDEX_NOFOLLOW_ROBOTS = {
  index: false,
  follow: false,
  googleBot: { index: false, follow: false },
} as const;

const INDEX_ROBOTS = {
  index: true,
  follow: true,
  googleBot: { index: true, follow: true },
} as const;

function noIndexRobots(noFollow: boolean) {
  return noFollow ? NO_INDEX_NOFOLLOW_ROBOTS : NO_INDEX_FOLLOW_ROBOTS;
}

/** Default robots for authenticated / private app shells. */
export function appShellRobots(): Pick<Metadata, "robots"> {
  return { robots: NO_INDEX_NOFOLLOW_ROBOTS };
}

/** Title + description + canonical/hreflang (or noindex for private pages). */
export function pageLocaleMetadata({
  title,
  description,
  locale,
  path = "",
  noIndex = false,
  noFollow = false,
}: PageMetaInput): Metadata {
  if (noIndex) {
    return {
      title,
      description,
      robots: noIndexRobots(noFollow),
      // Self-canonical only — do not emit hreflang for noindex URLs.
      alternates: { canonical: absoluteUrl(locale, path) },
    };
  }
  return {
    title,
    description,
    // Explicit index so public pages under the app shell override the default noindex.
    robots: INDEX_ROBOTS,
    alternates: localeAlternates(locale, path),
  };
}

/** Paths listed in sitemap + allowed for indexing (no locale prefix). */
export const SITEMAP_PUBLIC_PATHS = ["", "/pricing", ...guidePublicPaths()] as const;

function sitemapPriority(path: string, locale: string): number {
  const isHome = !path || path === "/";
  const vi = isHome ? 1 : path === "/pricing" ? 0.9 : 0.8;
  return locale === "en" ? Math.round((vi - 0.1) * 10) / 10 : vi;
}

/**
 * Build sitemap entries with hreflang alternates for each public path.
 * Emits one loc per locale (vi + en) so the file is ~14 URLs, not a share dump.
 */
export function buildSitemapEntries(
  paths: readonly string[] = SITEMAP_PUBLIC_PATHS,
): {
  url: string;
  lastModified: Date;
  changeFrequency: "weekly";
  priority: number;
  alternates: { languages: Record<string, string> };
}[] {
  const now = new Date();
  const locales = ["vi", "en"] as const;
  return paths.flatMap((path) => {
    const languages = {
      vi: absoluteUrl("vi", path),
      en: absoluteUrl("en", path),
      "x-default": absoluteUrl("vi", path),
    };
    return locales.map((locale) => ({
      url: absoluteUrl(locale, path),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: sitemapPriority(path, locale),
      alternates: { languages },
    }));
  });
}

/** robots.txt disallow prefixes (both unprefixed VI and `/en/...`).
 *  App surfaces like /check-in stay crawlable so Google can honor meta noindex.
 *  Only block truly private / thin admin & account routes.
 */
export function robotsDisallowPaths(): string[] {
  const prefixes = [
    "/admin",
    "/settings",
    "/me/",
    "/payment/",
    "/wardrobe",
  ];
  const out: string[] = [];
  for (const p of prefixes) {
    out.push(p);
    out.push(`/en${p}`);
  }
  return out;
}

export const FACEBOOK_PROFILE_URL = "https://www.facebook.com/dadiary.vn";
export const TIKTOK_PROFILE_URL = "https://www.tiktok.com/@dadiary8";

/** Public social profile URLs for Organization sameAs JSON-LD. */
export const ORGANIZATION_SAME_AS = [
  FACEBOOK_PROFILE_URL,
  TIKTOK_PROFILE_URL,
] as const;

type SocialMetaInput = PageMetaInput & {
  images?: OgImage[];
  /** Open Graph object type. Articles should pass `article` plus dates. */
  ogType?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
};

/**
 * Title + description + Open Graph + Twitter Card + canonical/hreflang.
 * Image URLs may be site-relative (`/og/...`); Next resolves them via metadataBase.
 */
export function pageSocialMetadata({
  title,
  description,
  locale,
  path = "",
  images,
  ogType = "website",
  publishedTime,
  modifiedTime,
  noIndex = false,
  noFollow = false,
}: SocialMetaInput): Metadata {
  const url = absoluteUrl(locale, path);
  const ogImages = images?.length ? images : [DEFAULT_OG_IMAGE];
  const twitterImages = ogImages.map((img) => img.url);
  const ogImagePayload = ogImages.map((img) => ({
    url: img.url,
    width: img.width ?? 1200,
    height: img.height ?? 630,
    alt: img.alt ?? title,
  }));

  return {
    title,
    description,
    robots: noIndex ? noIndexRobots(noFollow) : INDEX_ROBOTS,
    alternates: localeAlternates(locale, path),
    openGraph:
      ogType === "article"
        ? {
            title,
            description,
            url,
            siteName: SITE_NAME,
            locale: ogLocale(locale),
            alternateLocale: [ogAlternateLocale(locale)],
            type: "article",
            publishedTime,
            modifiedTime,
            images: ogImagePayload,
          }
        : {
            title,
            description,
            url,
            siteName: SITE_NAME,
            locale: ogLocale(locale),
            alternateLocale: [ogAlternateLocale(locale)],
            type: "website",
            images: ogImagePayload,
          },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: twitterImages,
      ...(process.env.NEXT_PUBLIC_TWITTER_SITE?.trim()
        ? { site: process.env.NEXT_PUBLIC_TWITTER_SITE.trim() }
        : {}),
    },
  };
}
