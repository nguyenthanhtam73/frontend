"use client";

import { ChevronDown, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Rough length where we collapse by default (mobile-readable chunk). */
const COLLAPSE_CHARS = 280;

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Long coach skin notes — show a short preview first so the page isn’t a wall of text.
 */
export function CoachWelcomeSkinReadback({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const t = useTranslations("coachWelcome");
  const tOnb = useTranslations("onboarding");
  const trimmed = text.trim();
  const paragraphs = useMemo(() => splitParagraphs(trimmed), [trimmed]);
  const needsCollapse = trimmed.length > COLLAPSE_CHARS || paragraphs.length > 2;
  const [expanded, setExpanded] = useState(false);

  if (!trimmed) return null;

  const preview =
    paragraphs[0] && paragraphs[0].length <= COLLAPSE_CHARS
      ? paragraphs[0]
      : `${trimmed.slice(0, COLLAPSE_CHARS).trim()}…`;

  return (
    <Card
      className={cn(
        "overflow-hidden border-primary/20 bg-gradient-to-br from-primary/[0.06] via-background to-emerald-500/[0.05] shadow-sm",
        className,
      )}
      data-testid="coach-welcome-skin-readback"
    >
      <CardContent className="space-y-2.5 pt-4 pb-4 sm:pt-5 sm:pb-5">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="size-4 text-primary" aria-hidden />
          </span>
          <p className="text-sm font-semibold text-foreground">{t("readback")}</p>
        </div>

        <div className="space-y-2.5 text-sm leading-relaxed text-foreground/90">
          {expanded || !needsCollapse ? (
            paragraphs.map((p, i) => (
              <p key={i} className="whitespace-pre-wrap">
                {p}
              </p>
            ))
          ) : (
            <p className="whitespace-pre-wrap">{preview}</p>
          )}
        </div>

        {needsCollapse ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex min-h-9 items-center gap-1 text-xs font-semibold text-primary"
            data-testid="coach-welcome-readback-toggle"
          >
            {expanded ? tOnb("step2.hideDetail") : t("readbackExpand")}
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
  if (shorter.length < 80) return false;
  return longer.includes(shorter.slice(0, Math.min(160, shorter.length)));
}
