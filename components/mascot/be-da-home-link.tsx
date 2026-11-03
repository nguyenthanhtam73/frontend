"use client";

import { useLocale, useTranslations } from "next-intl";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import { BeDaGlowNote } from "@/components/mascot/be-da-glow-note";
import { Link } from "@/i18n/navigation";
import { useBeDaView } from "@/lib/hooks/use-mascot";

/** Small mascot on the check-in home. Tap opens Bé Da's room. */
export function BeDaHomeLink() {
  const t = useTranslations("mascot");
  const locale = useLocale();
  const { view, stepPose, hidden, glowCelebrate } = useBeDaView();
  if (hidden) return null;
  return (
    <Link
      href="/be-da"
      data-testid="be-da-home"
      aria-label={t("homeAria")}
      className="inline-flex w-[5.5rem] shrink-0 flex-col items-center rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <BeDaFigure
        view={view}
        stepPose={stepPose}
        locale={locale}
        glowCelebrate={glowCelebrate}
        className="w-full"
      />
      <BeDaGlowNote view={view} celebrate={glowCelebrate} />
    </Link>
  );
}
