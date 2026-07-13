import { getTranslations } from "next-intl/server";

import { FeedbackForm } from "@/components/feedback/feedback-form";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.feedbackPage" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function FeedbackPage() {
  const t = await getTranslations("appFeedback");

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {t("sectionLabel")}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("pageTitle")}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">{t("pageSub")}</p>
      </div>
      <FeedbackForm />
    </div>
  );
}
