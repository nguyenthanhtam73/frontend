"use client";

import { Moon, Sun } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { StarterRoutineDTO } from "@/lib/types/starter-routine";
import { cn } from "@/lib/utils";

function numberedList(
  lines: string[],
  period: "morning" | "evening",
  large?: boolean,
) {
  return (
    <ol
      className={cn(
        "list-decimal space-y-2.5 pl-5 leading-relaxed text-foreground",
        large ? "text-[15px] sm:text-base" : "text-sm",
      )}
      data-testid={`coach-welcome-${period}-list`}
    >
      {lines.map((line, i) => (
        <li key={i} data-testid={`coach-welcome-${period}-${i}`}>
          {line}
        </li>
      ))}
    </ol>
  );
}

type StarterRoutineCardsProps = {
  starter: StarterRoutineDTO;
  morningLabel: string;
  eveningLabel: string;
  noStepsLabel: string;
  /** Hero layout for coach-welcome — larger cards, section heading. */
  featured?: boolean;
  sectionTitle?: string;
  sectionSubtitle?: string;
};

export function StarterRoutineCards({
  starter,
  morningLabel,
  eveningLabel,
  noStepsLabel,
  featured = false,
  sectionTitle,
  sectionSubtitle,
}: StarterRoutineCardsProps) {
  const cards = (
    <div
      className={cn("grid gap-4", featured ? "sm:grid-cols-2" : "sm:grid-cols-2")}
      data-testid="coach-welcome-starter-cards"
    >
      <Card
        className={cn(
          "overflow-hidden border-amber-500/30 bg-gradient-to-b from-amber-500/[0.08] to-transparent",
          featured && "border-2 shadow-md",
        )}
        data-testid="coach-welcome-morning"
      >
        <CardContent className={cn("space-y-3", featured ? "pt-6 pb-6 sm:pt-7" : "pt-6")}>
          <div className="flex items-center gap-2.5 font-semibold">
            <span
              className={cn(
                "flex items-center justify-center rounded-xl bg-amber-500/15",
                featured ? "size-10" : "size-9",
              )}
            >
              <Sun className={cn("text-amber-500", featured ? "size-5" : "size-5")} aria-hidden />
            </span>
            <span className={featured ? "text-lg" : undefined}>{morningLabel}</span>
          </div>
          {starter.morning.length > 0 ? (
            numberedList(starter.morning, "morning", featured)
          ) : (
            <p className="text-sm text-muted-foreground">{noStepsLabel}</p>
          )}
        </CardContent>
      </Card>
      <Card
        className={cn(
          "overflow-hidden border-indigo-500/30 bg-gradient-to-b from-indigo-500/[0.08] to-transparent",
          featured && "border-2 shadow-md",
        )}
        data-testid="coach-welcome-evening"
      >
        <CardContent className={cn("space-y-3", featured ? "pt-6 pb-6 sm:pt-7" : "pt-6")}>
          <div className="flex items-center gap-2.5 font-semibold">
            <span
              className={cn(
                "flex items-center justify-center rounded-xl bg-indigo-500/15",
                featured ? "size-10" : "size-9",
              )}
            >
              <Moon className="size-5 text-indigo-500" aria-hidden />
            </span>
            <span className={featured ? "text-lg" : undefined}>{eveningLabel}</span>
          </div>
          {starter.evening.length > 0 ? (
            numberedList(starter.evening, "evening", featured)
          ) : (
            <p className="text-sm text-muted-foreground">{noStepsLabel}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );

  if (!featured) return cards;

  return (
    <div className="space-y-4" data-testid="coach-welcome-starter">
      {sectionTitle ? (
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-tight sm:text-xl">{sectionTitle}</h2>
          {sectionSubtitle ? (
            <p className="text-sm text-muted-foreground">{sectionSubtitle}</p>
          ) : null}
        </div>
      ) : null}
      {cards}
    </div>
  );
}
