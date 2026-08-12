import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { PWA_SPLASH_LINKS } from "@/lib/pwa-splash";
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  siteOrigin,
  siteVerificationMetadata,
} from "@/lib/seo";

import "./globals.css";

/**
 * Root layout stays a pass-through so `[locale]/layout` can own `<html lang>`.
 * Fonts, body chrome, and providers live under the locale layout.
 *
 * `metadataBase` makes relative OG image paths resolve to absolute
 * https://dadiary.vn/... (override via NEXT_PUBLIC_APP_URL / NEXT_PUBLIC_SITE_URL).
 */
export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  applicationName: SITE_NAME,
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    images: [
      {
        url: DEFAULT_OG_IMAGE.url,
        width: DEFAULT_OG_IMAGE.width,
        height: DEFAULT_OG_IMAGE.height,
        alt: DEFAULT_OG_IMAGE.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: [DEFAULT_OG_IMAGE.url],
  },
  icons: {
    icon: [
      { url: "/brand/dadiary-logo.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    other: PWA_SPLASH_LINKS.map((link) => ({
      rel: "apple-touch-startup-image",
      url: link.url,
      media: link.media,
    })),
  },
  formatDetection: {
    telephone: false,
  },
  ...siteVerificationMetadata(),
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#9DD7D4" },
    { media: "(prefers-color-scheme: dark)", color: "#1a2b30" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
