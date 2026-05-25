import { Camera, ShieldCheck, Sparkles } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { CheckInForm } from "@/components/check-in/check-in-form";
import { OfflineNotice } from "@/components/site/offline-notice";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.checkIn" });
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function CheckInPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checkIn" });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 pb-28 sm:px-6 sm:py-10 sm:pb-10 lg:pb-14">
      {/* Page hero — short, supportive intro + 3 tiny "what this page does" tiles. */}
      <header className="mb-6 max-w-2xl space-y-2 sm:mb-8 sm:space-y-3">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {t("sectionEyebrow")}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-4xl">
          {t("pageTitle")}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          {t("pageSub")}
        </p>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-2 sm:mb-8 sm:grid-cols-3">
        <HeroTile
          icon={<Camera className="size-4" aria-hidden />}
          title={t("heroStepPhoto")}
          desc={t("heroStepPhotoDesc")}
        />
        <HeroTile
          icon={<Sparkles className="size-4" aria-hidden />}
          title={t("heroStepCoach")}
          desc={t("heroStepCoachDesc")}
        />
        <HeroTile
          icon={<ShieldCheck className="size-4" aria-hidden />}
          title={t("heroStepSafety")}
          desc={t("heroStepSafetyDesc")}
        />
      </div>

      {/* Surface offline state before the form so users know uploads/AI feedback
          will likely fail until connectivity returns. */}
      <OfflineNotice className="mb-6" messageKey="offlineCheckInBody" />

      <CheckInForm />
    </div>
  );
}

function HeroTile({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="group flex gap-3 rounded-xl border border-border/80 bg-card/60 px-3 py-2.5 shadow-sm backdrop-blur transition-colors hover:border-primary/30 hover:bg-card sm:px-4 sm:py-3">
      <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary ring-1 ring-primary/20">
        {icon}
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="truncate text-sm font-semibold leading-tight">{title}</p>
        <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
          {desc}
        </p>
      </div>
    </div>
  );
}
