import { getTranslations } from "next-intl/server";

import { OnboardingPageClient } from "@/components/onboarding/onboarding-page-client";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.onboarding" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default function OnboardingPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <OnboardingPageClient />
    </div>
  );
}
