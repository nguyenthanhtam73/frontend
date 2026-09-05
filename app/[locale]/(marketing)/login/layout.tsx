import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { MergedMessagesLayout } from "@/components/i18n/merged-messages-layout";
import { AUTH_FUNNEL_MESSAGE_NAMESPACES } from "@/lib/i18n/client-messages";
import { pageLocaleMetadata } from "@/lib/seo";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.login" });
  return pageLocaleMetadata({
    title: t("title"),
    description: t("description"),
    locale,
    path: "/login",
    noIndex: true,
  });
}

export default function LoginLayout({ children }: Props) {
  return (
    <MergedMessagesLayout namespaces={AUTH_FUNNEL_MESSAGE_NAMESPACES}>
      {children}
    </MergedMessagesLayout>
  );
}
