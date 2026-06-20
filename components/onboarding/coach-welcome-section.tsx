"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Fade-in section wrapper for coach-welcome / review pages. */
export function CoachWelcomeSection({
  children,
  className,
  delayMs = 0,
  id,
}: {
  children: ReactNode;
  className?: string;
  /** Stagger entrance animations between sections. */
  delayMs?: number;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:fill-mode-both",
        className,
      )}
      style={delayMs > 0 ? { animationDelay: `${delayMs}ms` } : undefined}
    >
      {children}
    </section>
  );
}

export function CoachWelcomeSectionHeading({
  title,
  subtitle,
  className,
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-3 space-y-0.5 sm:mb-4", className)}>
      <h2 className="text-base font-semibold tracking-tight sm:text-lg">{title}</h2>
      {subtitle ? (
        <p className="text-sm leading-snug text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}
