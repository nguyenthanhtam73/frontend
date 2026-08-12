import type { Metadata } from "next";
import { Geist_Mono, Nunito_Sans } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { MetaPixel } from "@/components/site/meta-pixel";
import { OfflineIndicator } from "@/components/site/offline-indicator";
import { PwaRegister } from "@/components/site/pwa-register";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { routing } from "@/i18n/routing";
import { SHELL_MESSAGE_NAMESPACES, pickMessages } from "@/lib/i18n/client-messages";
import { DEFAULT_OG_IMAGE, SITE_NAME, ogLocale } from "@/lib/seo";

import { AppProviders } from "../providers";

/** Nunito Sans: rounded strokes; Vietnamese subset; swap + fallback metrics for CWV. */
const fontSans = Nunito_Sans({
  variable: "--font-ui-sans",
  subsets: ["latin", "latin-ext", "vietnamese"],
  display: "swap",
  adjustFontFallback: true,
});

/** Mono is rare on marketing pages — skip preload to free LCP bandwidth. */
const fontMono = Geist_Mono({
  variable: "--font-ui-mono",
  subsets: ["latin"],
  display: "swap",
  adjustFontFallback: true,
  preload: false,
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Locale defaults for every page. Intentionally omits openGraph.title / .url /
 * .description so Next can sync them from each page's `title` + `description`.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.root" });
  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      siteName: SITE_NAME,
      locale: ogLocale(locale),
      type: "website",
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
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);
  const allMessages = await getMessages({ locale });
  // Shell only — route segments merge extras via MergeMessagesProvider (no dupe).
  const messages = pickMessages(allMessages, SHELL_MESSAGE_NAMESPACES);

  return (
    <html
      lang={locale}
      className={`${fontSans.variable} ${fontMono.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col antialiased">
        <NextIntlClientProvider messages={messages} locale={locale}>
          <MetaPixel />
          <AppProviders>
            <OfflineIndicator />
            <SiteHeader />
            <main className="flex flex-1 flex-col">{children}</main>
            <SiteFooter />
            <PwaRegister />
          </AppProviders>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
