import { getTranslations } from "next-intl/server";

import { FeedbacksAdminView } from "@/components/admin/feedbacks-admin-view";
import { Link } from "@/i18n/navigation";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.adminFeedbacks" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function AdminFeedbacksPage() {
  const t = await getTranslations("adminFeedbacks");
  const tUsers = await getTranslations("adminUsers");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8 space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {t("sectionLabel")}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">{t("sub")}</p>
        <p className="text-sm">
          <Link
            href="/admin/users"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            {tUsers("title")} →
          </Link>
        </p>
      </div>
      <FeedbacksAdminView />
    </div>
  );
}
