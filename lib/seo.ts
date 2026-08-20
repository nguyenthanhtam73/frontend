import type { Metadata } from "next";

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
   * Private / app-only routes: `noindex,nofollow`, canonical only (no hreflang).
   * Use for /admin/*, /settings, /me/*, /payment/*.
   */
  noIndex?: boolean;
};

const NO_INDEX_ROBOTS = {
  index: false,
  // Keep follow so internal links from app pages still pass equity.
  follow: true,
  googleBot: { index: false, follow: true },
} as const;

const INDEX_ROBOTS = {
  index: true,
  follow: true,
  googleBot: { index: true, follow: true },
} as const;

/** Default robots for authenticated / private app shells. */
export function appShellRobots(): Pick<Metadata, "robots"> {
  return { robots: NO_INDEX_ROBOTS };
}

/** Title + description + canonical/hreflang (or noindex for private pages). */
export function pageLocaleMetadata({
  title,
  description,
  locale,
  path = "",
  noIndex = false,
}: PageMetaInput): Metadata {
  if (noIndex) {
    return {
      title,
      description,
      robots: NO_INDEX_ROBOTS,
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
export const SITEMAP_PUBLIC_PATHS = [
  "",
  "/pricing",
  "/guides",
  "/guides/da-dau",
  "/guides/mun",
  "/guides/kem-chong-nang",
  "/guides/routine-cham-da",
  "/login",
  "/register",
  "/onboarding",
  "/feedback",
] as const;

/**
 * Build sitemap entries with hreflang alternates for each public path.
 * Emits the VI URL as the primary `url` (x-default) plus language map.
 */
export function buildSitemapEntries(
  paths: readonly string[] = SITEMAP_PUBLIC_PATHS,
): {
  url: string;
  lastModified: Date;
  changeFrequency: "weekly" | "monthly";
  priority: number;
  alternates: { languages: Record<string, string> };
}[] {
  const now = new Date();
  return paths.map((path) => {
    const isHome = !path || path === "/";
    const isGuide = path === "/guides" || path.startsWith("/guides/");
    return {
      url: absoluteUrl("vi", path),
      lastModified: now,
      changeFrequency: (isHome || path === "/pricing" || isGuide ? "weekly" : "monthly") as
        | "weekly"
        | "monthly",
      priority: isHome ? 1 : path === "/pricing" ? 0.9 : isGuide ? 0.8 : 0.6,
      alternates: {
        languages: {
          vi: absoluteUrl("vi", path),
          en: absoluteUrl("en", path),
          "x-default": absoluteUrl("vi", path),
        },
      },
    };
  });
}

/** Sitemap entries for public skin-review share pages (vi + en hreflang). */
export function buildShareSitemapEntries(
  items: { slug: string; lastModified?: Date }[],
): {
  url: string;
  lastModified: Date;
  changeFrequency: "weekly";
  priority: number;
  alternates: { languages: Record<string, string> };
}[] {
  return items.map(({ slug, lastModified }) => {
    const path = `/share/skin-review/${slug}`;
    return {
      url: absoluteUrl("vi", path),
      lastModified: lastModified ?? new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
      alternates: {
        languages: {
          vi: absoluteUrl("vi", path),
          en: absoluteUrl("en", path),
          "x-default": absoluteUrl("vi", path),
        },
      },
    };
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
}: SocialMetaInput): Metadata {
  const url = absoluteUrl(locale, path);
  const ogImages = images?.length ? images : [DEFAULT_OG_IMAGE];
  const twitterImages = ogImages.map((img) => img.url);

  return {
    title,
    description,
    alternates: localeAlternates(locale, path),
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: ogLocale(locale),
      alternateLocale: [ogAlternateLocale(locale)],
      type: "website",
      images: ogImages.map((img) => ({
        url: img.url,
        width: img.width ?? 1200,
        height: img.height ?? 630,
        alt: img.alt ?? title,
      })),
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
