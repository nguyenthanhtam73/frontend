import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { LocaleHtmlAttributes } from "@/components/site/locale-html-attributes";
import { LocaleNavigationBridge } from "@/components/site/locale-navigation-bridge";
import { OfflineIndicator } from "@/components/site/offline-indicator";
import { PwaRegister } from "@/components/site/pwa-register";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { routing } from "@/i18n/routing";

import { AppProviders } from "../providers";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.root" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <LocaleHtmlAttributes />
      <LocaleNavigationBridge>
        <AppProviders>
          <OfflineIndicator />
          <SiteHeader />
          <main className="flex flex-1 flex-col">{children}</main>
          <SiteFooter />
          <PwaRegister />
        </AppProviders>
      </LocaleNavigationBridge>
    </NextIntlClientProvider>
  );
}
