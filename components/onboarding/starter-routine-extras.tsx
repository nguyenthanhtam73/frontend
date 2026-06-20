"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";

import { CoachWelcomeSection } from "@/components/onboarding/coach-welcome-section";
import { Card, CardContent } from "@/components/ui/card";
import type { StarterRoutineDTO } from "@/lib/types/starter-routine";

/** Rationale + first-week notes (between routine and product picks). */
export function StarterRoutineSupportExtras({
  starter,
  delayMs = 0,
}: {
  starter: StarterRoutineDTO;
  delayMs?: number;
}) {
  const t = useTranslations("coachWelcome");

  if (!starter.rationale?.trim() && !starter.week_notes?.trim()) return null;

  return (
    <>
      {starter.rationale ? (
        <CoachWelcomeSection delayMs={delayMs}>
          <Card>
            <CardContent className="space-y-2 pt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("why")}
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{starter.rationale}</p>
            </CardContent>
          </Card>
        </CoachWelcomeSection>
      ) : null}

      {starter.week_notes ? (
        <CoachWelcomeSection delayMs={delayMs + 40}>
          <Card>
            <CardContent className="space-y-2 pt-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("weekNotes")}
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{starter.week_notes}</p>
            </CardContent>
          </Card>
        </CoachWelcomeSection>
      ) : null}
    </>
  );
}

export function StarterRoutineSafetySection({
  starter,
  delayMs = 0,
}: {
  starter: StarterRoutineDTO;
  delayMs?: number;
}) {
  const t = useTranslations("coachWelcome");

  if (!starter.safety_notes?.trim() && !starter.closing_reminder?.trim()) return null;

  return (
    <>
      {starter.safety_notes ? (
        <CoachWelcomeSection delayMs={delayMs} id="coach-welcome-safety">
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="space-y-2 pt-6">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-200">
                <ShieldCheck className="size-4" aria-hidden />
                {t("safety")}
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{starter.safety_notes}</p>
            </CardContent>
          </Card>
        </CoachWelcomeSection>
      ) : null}

      {starter.closing_reminder ? (
        <p className="text-center text-sm font-medium text-muted-foreground">
          {starter.closing_reminder}
        </p>
      ) : null}
    </>
  );
}

/** @deprecated Use StarterRoutineSupportExtras + StarterRoutineSafetySection */
export function StarterRoutineExtras({
  starter,
  delayMs = 0,
}: {
  starter: StarterRoutineDTO;
  delayMs?: number;
}) {
  return (
    <>
      <StarterRoutineSupportExtras starter={starter} delayMs={delayMs} />
      <StarterRoutineSafetySection starter={starter} delayMs={delayMs + 80} />
    </>
  );
}
