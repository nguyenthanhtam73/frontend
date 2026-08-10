"use client";

import { Check, ShieldCheck } from "lucide-react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { isNearDuplicateText } from "@/components/onboarding/coach-welcome-skin-readback";
import { CoachWelcomeSection } from "@/components/onboarding/coach-welcome-section";
import { Card, CardContent } from "@/components/ui/card";
import { safetyNotesToChecklist } from "@/lib/onboarding/safety-checklist";
import type { StarterRoutineDTO } from "@/lib/types/starter-routine";

/** Rationale + encouragement + first-week notes (after folded AM/PM tips). */
export function StarterRoutineSupportExtras({
  starter,
  delayMs = 0,
  /** Hide rationale when it repeats the skin readback above. */
  skinReadback,
}: {
  starter: StarterRoutineDTO;
  delayMs?: number;
  skinReadback?: string;
}) {
  const t = useTranslations("coachWelcome");
  const rationale = starter.rationale?.trim() || "";
  const encouragement = starter.encouragement?.trim() || "";
  const weekNotes = starter.week_notes?.trim() || "";
  const safety = starter.safety_notes?.trim() || "";
  const showRationale =
    Boolean(rationale) &&
    !isNearDuplicateText(rationale, skinReadback?.trim() || "");
  const showEncouragement =
    Boolean(encouragement) &&
    !isNearDuplicateText(encouragement, skinReadback?.trim() || "") &&
    !isNearDuplicateText(encouragement, rationale) &&
    !isNearDuplicateText(encouragement, weekNotes);
  const showWeekNotes =
    Boolean(weekNotes) &&
    !isNearDuplicateText(weekNotes, safety) &&
    !isNearDuplicateText(weekNotes, rationale) &&
    !isNearDuplicateText(weekNotes, skinReadback?.trim() || "") &&
    !isNearDuplicateText(weekNotes, encouragement);

  if (!showRationale && !showEncouragement && !showWeekNotes) return null;

  let delay = delayMs;

  return (
    <>
      {showRationale ? (
        <CoachWelcomeSection delayMs={delay}>
          <Card>
            <CardContent className="space-y-2 pt-5 pb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("why")}
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{rationale}</p>
            </CardContent>
          </Card>
        </CoachWelcomeSection>
      ) : null}

      {showEncouragement ? (
        <CoachWelcomeSection delayMs={(delay += showRationale ? 40 : 0)}>
          <Card className="border-primary/15 bg-primary/[0.03]">
            <CardContent className="space-y-2 pt-5 pb-5" data-testid="coach-welcome-encouragement">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("encouragement")}
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{encouragement}</p>
            </CardContent>
          </Card>
        </CoachWelcomeSection>
      ) : null}

      {showWeekNotes ? (
        <CoachWelcomeSection
          delayMs={
            delay + (showRationale || showEncouragement ? 40 : 0)
          }
        >
          <Card>
            <CardContent className="space-y-2 pt-5 pb-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t("weekNotes")}
              </p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{weekNotes}</p>
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
  const items = useMemo(
    () => safetyNotesToChecklist(starter.safety_notes?.trim() || ""),
    [starter.safety_notes],
  );

  if (!starter.safety_notes?.trim() && !starter.closing_reminder?.trim()) return null;

  return (
    <>
      {starter.safety_notes?.trim() ? (
        <CoachWelcomeSection delayMs={delayMs} id="coach-welcome-safety">
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="space-y-3 pt-5 pb-5">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-200">
                <ShieldCheck className="size-4 shrink-0" aria-hidden />
                {t("safety")}
              </div>
              <ul className="space-y-2" data-testid="coach-welcome-safety-list">
                {items.map((item, i) => (
                  <li key={`${i}-${item.slice(0, 24)}`} className="flex gap-2.5 text-sm leading-snug">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                      <Check className="size-3" aria-hidden />
                    </span>
                    <span className="text-foreground/90">{item}</span>
                  </li>
                ))}
              </ul>
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
