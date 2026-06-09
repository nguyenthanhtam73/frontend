"use client";

import { useTranslations } from "next-intl";

import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type GuestCoachWelcomeCtaProps = {
  variant: "ready" | "fallback";
};

export function GuestCoachWelcomeCta({ variant }: GuestCoachWelcomeCtaProps) {
  const t = useTranslations("coachWelcome");

  return (
    <Card className="border-primary/15 bg-primary/[0.04] shadow-sm">
      <CardContent className="space-y-4 pt-6 text-center sm:text-left">
        <p className="text-sm leading-relaxed text-foreground/90">
          {variant === "ready" ? t("guestRoutineReadyCta") : t("guestRoutineFallbackCta")}
        </p>
        <div className="flex flex-col gap-3">
          <ButtonLink href="/register" size="lg" className="min-h-11 w-full font-semibold">
            {t("guestRegisterFreeCta")}
          </ButtonLink>
          <Link
            href="/login"
            className={cn(
              "text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline",
            )}
          >
            {t("guestSignInExistingCta")}
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
