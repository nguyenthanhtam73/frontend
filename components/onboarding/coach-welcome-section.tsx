"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Soft fade for coach-welcome / review sections. */
export function CoachWelcomeSection({
  children,
  className,
  id,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200",
        className,
      )}
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
