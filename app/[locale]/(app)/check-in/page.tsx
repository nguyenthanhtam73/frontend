import { getTranslations } from "next-intl/server";

import { pageLocaleMetadata } from "@/lib/seo";

import dynamic from "next/dynamic";

import { ActivationPushCta } from "@/components/activation/activation-push-cta";
import { ActivationStreakCard } from "@/components/activation/activation-streak-card";
import { CheckInFirstVisit } from "@/components/activation/check-in-first-visit";
import { CheckInFormSkeleton } from "@/components/check-in/check-in-form-skeleton";
import { CheckInPageHero } from "@/components/check-in/check-in-page-hero";
import { OfflineNotice } from "@/components/site/offline-notice";

const CheckInForm = dynamic(
  () =>
    import("@/components/check-in/check-in-form").then((m) => ({
      default: m.CheckInForm,
    })),
  { loading: () => <CheckInFormSkeleton /> },
);

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.checkIn" });
  return pageLocaleMetadata({
    title: t("title"),
    description: t("description"),
    locale,
    path: "/check-in",
    noIndex: true,
  });
}

export default async function CheckInPage({ params }: Props) {
  await params;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 pb-28 sm:px-6 sm:py-10 sm:pb-10 lg:pb-14">
      <CheckInPageHero />

      <ActivationStreakCard className="mb-6 sm:mb-8" hideCheckInCta />
      <ActivationPushCta
        surface="check_in_page"
        onlyIfNeverCheckedIn
        className="mb-6 sm:mb-8"
      />
      <CheckInFirstVisit />

      {/* Surface offline state before the form so users know uploads/AI feedback
          will likely fail until connectivity returns. */}
      <OfflineNotice className="mb-6" messageKey="offlineCheckInBody" />

      <CheckInForm />
    </div>
  );
}
