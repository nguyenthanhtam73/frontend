"use client";

import { ChevronDown, Eye, HeartHandshake, Sparkles, Stethoscope } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Card, CardContent } from "@/components/ui/card";
import {
  parseCoachNoteSections,
  pickCoachVerdict,
  previewCoachText,
  type CoachNoteSection,
  type CoachNoteSectionKind,
} from "@/lib/onboarding/coach-notes-sections";
import { cn } from "@/lib/utils";

function sectionIcon(kind: CoachNoteSectionKind) {
  switch (kind) {
    case "observe":
      return Eye;
    case "verdict":
      return Sparkles;
    case "buddy":
      return HeartHandshake;
    case "advice":
      return Stethoscope;
    default:
      return Sparkles;
  }
}

function sectionLabelKey(
  kind: CoachNoteSectionKind,
):
  | "readbackSectionObserve"
  | "readbackSectionVerdict"
  | "readbackSectionBuddy"
  | "readbackSectionAdvice"
  | null {
  switch (kind) {
    case "observe":
      return "readbackSectionObserve";
    case "verdict":
      return "readbackSectionVerdict";
    case "buddy":
      return "readbackSectionBuddy";
    case "advice":
      return "readbackSectionAdvice";
    default:
      return null;
  }
}

/**
 * Long coach skin notes — short verdict first, clinical detail behind expand.
 * Pass `alwaysExpanded` on archive/review to show every section without a toggle.
 */
export function CoachWelcomeSkinReadback({
  text,
  className,
  photos,
  photoAlt,
  phaseHint,
  alwaysExpanded = false,
}: {
  text: string;
  className?: string;
  /** Optional face photos shown next to the verdict. */
  photos?: string[];
  photoAlt?: (n: number) => string;
  /** e.g. calm_first → calm-first chip from analysis. */
  phaseHint?: string | null;
  /** When true, render all sections (no collapse control). */
  alwaysExpanded?: boolean;
}) {
  const t = useTranslations("coachWelcome");
  const trimmed = text.trim();
  const sections = useMemo(() => parseCoachNoteSections(trimmed), [trimmed]);
  const verdict = useMemo(() => pickCoachVerdict(sections), [sections]);
  const observe = sections.find((s) => s.kind === "observe");
  const needsCollapse =
    !alwaysExpanded && (trimmed.length > 140 || sections.length > 1);
  const [expanded, setExpanded] = useState(alwaysExpanded);
  const showFull = alwaysExpanded || expanded;

  if (!trimmed) return null;

  const phaseChip =
    phaseHint === "calm_first"
      ? t("readbackPhaseCalm")
      : phaseHint === "can_add_active"
        ? t("readbackPhaseActive")
        : null;

  const collapsedPreview = (() => {
    if (verdict) return previewCoachText(verdict, 180);
    if (observe) return previewCoachText(observe.text, 160);
    return previewCoachText(trimmed, 160);
  })();

  return (
    <Card
      className={cn(
        "overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.06] via-background to-emerald-500/[0.05] shadow-sm",
        className,
      )}
      data-testid="coach-welcome-skin-readback"
    >
      <CardContent className="space-y-3 pt-4 pb-4 sm:space-y-4 sm:pt-5 sm:pb-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="size-4 text-primary" aria-hidden />
            </span>
            <p className="text-sm font-semibold text-foreground">{t("readback")}</p>
          </div>
          {phaseChip ? (
            <span
              className="inline-flex min-h-7 items-center rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-200"
              data-testid="coach-welcome-phase-chip"
            >
              {phaseChip}
            </span>
          ) : null}
        </div>

        {photos && photos.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground">
              {t("readbackPhotosHint")}
            </p>
            <ul className="flex gap-2 overflow-x-auto pb-0.5">
              {photos.slice(0, 3).map((url, i) => (
                <li key={`${url}-${i}`} className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={photoAlt?.(i + 1) ?? ""}
                    className="size-14 rounded-lg border border-border/70 object-cover shadow-sm sm:size-16"
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!showFull ? (
          <div className="space-y-2">
            <p
              className="text-sm font-medium leading-relaxed text-foreground"
              data-testid="coach-welcome-readback-preview"
            >
              {collapsedPreview}
            </p>
          </div>
        ) : (
          <div
            className={cn("space-y-3", alwaysExpanded && "space-y-3.5 sm:space-y-4")}
            data-testid="coach-welcome-readback-full"
          >
            {sections.map((section, i) => (
              <ReadbackSectionBlock
                key={`${section.kind}-${i}`}
                section={section}
                roomy={alwaysExpanded}
              />
            ))}
          </div>
        )}

        {needsCollapse ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-primary"
            aria-expanded={expanded}
            data-testid="coach-welcome-readback-toggle"
          >
            {expanded ? t("readbackCollapse") : t("readbackExpand")}
            <ChevronDown
              className={cn("size-3.5 transition-transform", expanded && "rotate-180")}
              aria-hidden
            />
          </button>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ReadbackSectionBlock({
  section,
  roomy = false,
}: {
  section: CoachNoteSection;
  roomy?: boolean;
}) {
  const t = useTranslations("coachWelcome");
  const labelKey = sectionLabelKey(section.kind);
  const Icon = sectionIcon(section.kind);
  const isVerdict = section.kind === "verdict";

  return (
    <div
      className={cn(
        "rounded-xl border",
        roomy ? "px-3.5 py-3.5 sm:px-4 sm:py-4" : "px-3 py-2.5",
        isVerdict
          ? "border-primary/25 bg-primary/[0.06]"
          : "border-border/50 bg-muted",
      )}
    >
      {labelKey ? (
        <div className={cn("flex items-center gap-1.5", roomy ? "mb-2" : "mb-1.5")}>
          <Icon
            className={cn(
              "shrink-0",
              roomy ? "size-4" : "size-3.5",
              isVerdict ? "text-primary" : "text-muted-foreground",
            )}
            aria-hidden
          />
          <p
            className={cn(
              "font-bold uppercase tracking-wide",
              roomy ? "text-[11px]" : "text-[10px]",
              isVerdict ? "text-primary" : "text-muted-foreground",
            )}
          >
            {t(labelKey)}
          </p>
        </div>
      ) : null}
      <p
        className={cn(
          "leading-relaxed whitespace-pre-wrap",
          roomy ? "text-[15px] leading-7" : "text-sm",
          isVerdict ? "font-medium text-foreground" : "text-foreground/90",
        )}
      >
        {section.text}
      </p>
    </div>
  );
}

/** Skip rationale card when it mostly repeats the skin readback. */
export function isNearDuplicateText(a: string, b: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .trim();
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const shorter = x.length <= y.length ? x : y;
  const longer = x.length <= y.length ? y : x;
  if (shorter.length < 40) return false;
  return longer.includes(shorter);
}
