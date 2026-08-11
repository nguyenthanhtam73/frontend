import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

import { pageLocaleMetadata } from "@/lib/seo";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.register" });
  return pageLocaleMetadata({
    title: t("title"),
    description: t("description"),
    locale,
    path: "/register",
  });
}

export default function RegisterLayout({ children }: Props) {
  return children;
}
