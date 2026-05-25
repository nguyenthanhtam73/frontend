import type { Metadata, Viewport } from "next";
import { Geist_Mono, Nunito_Sans } from "next/font/google";

import { PWA_SPLASH_LINKS } from "@/lib/pwa-splash";

import "./globals.css";

/** Nunito Sans: rounded, relaxed strokes — reads softer than geometric sans; Vietnamese subset included. */
const fontSans = Nunito_Sans({
  variable: "--font-ui-sans",
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
});

const fontMono = Geist_Mono({
  variable: "--font-ui-mono",
  subsets: ["latin"],
});

/**
 * Locale-agnostic metadata. The localised title + description live in
 * `app/[locale]/layout.tsx` and merge with these values automatically.
 *
 * Manifest and PWA icons are declared here so they're emitted once on every
 * page (including non-localised routes such as 404).
 */
export const metadata: Metadata = {
  applicationName: "DaDiary",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "DaDiary",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    // iOS standalone launch images. Each entry's media query is targeted at a
    // specific device class so the OS picks exactly one. List is generated
    // from `scripts/generate-pwa-icons.mjs` — re-run after adding new sizes.
    other: PWA_SPLASH_LINKS.map((link) => ({
      rel: "apple-touch-startup-image",
      url: link.url,
      media: link.media,
    })),
  },
  formatDetection: {
    telephone: false,
  },
};

/**
 * Theme colour matches the manifest so the browser chrome (Android URL bar,
 * iOS status bar) blends with the soft skincare palette in both light and
 * dark mode. `viewportFit: "cover"` lets us paint into safe-area insets
 * when running standalone on notched devices.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#9DD7D4" },
    { media: "(prefers-color-scheme: dark)", color: "#1a2b30" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${fontSans.variable} ${fontMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col antialiased">{children}</body>
    </html>
  );
}
