"use client";

import { CalendarCheck, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { FUNNEL_EVENTS, trackFunnelEvent } from "@/lib/analytics/funnel";
import { buildAuthHrefWithNext } from "@/lib/auth/return-path";
import type { GuestCheckInPayload } from "@/lib/check-in/guest-check-in-persist";

const GUEST_CHECKIN_AUTH_NEXT = "/check-in";

export function GuestLocalCheckInCard({
  payload,
  onRedo,
}: {
  payload: GuestCheckInPayload;
  onRedo: () => void;
}) {
  const t = useTranslations("checkIn.guestLocal");

  return (
    <Card
      className="border-primary/30 bg-gradient-to-br from-primary/[0.08] via-background to-emerald-500/[0.05]"
      data-testid="guest-checkin-saved"
    >
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <CalendarCheck className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1">
            <p className="text-base font-semibold leading-snug">{t("savedTitle")}</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {t("savedBody")}
            </p>
            {payload.userNote.trim() ? (
              <p className="text-sm leading-snug text-foreground/90">
                “{payload.userNote.trim()}”
              </p>
            ) : null}
          </div>
        </div>
        <ButtonLink
          href={buildAuthHrefWithNext("/register", GUEST_CHECKIN_AUTH_NEXT)}
          size="lg"
          className="min-h-12 w-full gap-2 text-base font-bold"
          data-testid="guest-checkin-register-cta"
          onClick={() =>
            trackFunnelEvent(FUNNEL_EVENTS.signupCtaClick, {
              surface: "guest_checkin_saved",
              intent: "register",
            })
          }
        >
          <UserPlus className="size-5 shrink-0" aria-hidden />
          {t("registerCta")}
        </ButtonLink>
        <Link
          href={buildAuthHrefWithNext("/login", GUEST_CHECKIN_AUTH_NEXT)}
          className="block text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          onClick={() =>
            trackFunnelEvent(FUNNEL_EVENTS.signupCtaClick, {
              surface: "guest_checkin_saved",
              intent: "login",
            })
          }
        >
          {t("loginCta")}
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full text-xs text-muted-foreground"
          data-testid="guest-checkin-redo"
          onClick={onRedo}
        >
          {t("redo")}
        </Button>
      </CardContent>
    </Card>
  );
}

export function GuestCheckInHint() {
  const t = useTranslations("checkIn.guestLocal");
  return (
    <p
      className="rounded-xl border border-dashed border-primary/25 bg-primary/[0.04] px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground"
      data-testid="guest-checkin-hint"
    >
      {t("hint")}
    </p>
  );
}
