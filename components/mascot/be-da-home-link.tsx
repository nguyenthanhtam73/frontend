"use client";

import { useLocale, useTranslations } from "next-intl";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import { Link } from "@/i18n/navigation";
import { useBeDaView } from "@/lib/hooks/use-mascot";

/** Small mascot on the check-in home. Tap opens the routine page. */
export function BeDaHomeLink() {
  const t = useTranslations("mascot");
  const locale = useLocale();
  const { view, stepPose, hidden } = useBeDaView();
  if (hidden) return null;
  return (
    <Link
      href="/routine"
      data-testid="be-da-home"
      aria-label={t("homeAria")}
      className="inline-flex w-16 shrink-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <BeDaFigure view={view} stepPose={stepPose} locale={locale} className="w-full" />
    </Link>
  );
}
