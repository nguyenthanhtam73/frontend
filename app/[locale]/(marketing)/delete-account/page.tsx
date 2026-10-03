import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import {
  DELETE_ACCOUNT_STEP_KEYS,
  DeleteAccountDoc,
} from "@/components/legal/delete-account-doc";
import { localePath, pageSocialMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.deleteAccountPage" });
  return pageSocialMetadata({
    title: t("title"),
    description: t("description"),
    locale,
    path: "/delete-account",
  });
}

/** Public page. Marketing layout — no auth redirect. */
export default async function DeleteAccountPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "legal.deleteAccount" });
  const tSocial = await getTranslations({ locale, namespace: "common.footer.social" });

  return (
    <DeleteAccountDoc
      privacyHref={localePath(locale, "/privacy")}
      homeHref={localePath(locale, "/")}
      copy={{
        title: t("title"),
        intro: t("intro"),
        stepsTitle: t("stepsTitle"),
        steps: DELETE_ACCOUNT_STEP_KEYS.map((key) => t(`steps.${key}`)),
        deletedTitle: t("deletedTitle"),
        deletedBody: t("deletedBody"),
        keptTitle: t("keptTitle"),
        retentionPayments: t("retention.payments"),
        retentionStats: t("retention.stats"),
        undo: t("undo"),
        cantSignInTitle: t("cantSignInTitle"),
        cantSignInBody: t("cantSignInBody"),
        privacyLink: t("privacyLink"),
        homeLink: t("homeLink"),
        facebookLabel: tSocial("facebook"),
        tiktokLabel: tSocial("tiktok"),
      }}
    />
  );
}
