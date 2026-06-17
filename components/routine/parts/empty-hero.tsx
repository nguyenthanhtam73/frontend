"use client";

import { Droplet, Moon, Shield, Sun } from "lucide-react";

/**
 * First-run state when the user has no routine yet.
 * Points them at the morning/evening editors below — no AI draft on this page.
 */
export function EmptyHero({
  labels,
}: {
  labels: {
    title: string;
    body: string;
    am: string;
    pm: string;
    amHint: string;
    pmHint: string;
    safety: string;
  };
}) {
  return (
    <section
      aria-label={labels.title}
      className="relative overflow-hidden rounded-3xl border border-primary/25 bg-linear-to-br from-primary/12 via-accent/35 to-background p-5 shadow-sm sm:p-8 in-animate animate-in fade-in slide-in-from-bottom-2 duration-400"
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-44 rounded-full bg-primary/30 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-12 size-52 rounded-full bg-accent/40 blur-3xl"
        aria-hidden
      />

      <div className="relative grid gap-6 sm:grid-cols-[minmax(0,1fr),auto] sm:items-center sm:gap-8">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
            {labels.title}
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            {labels.body}
          </p>
        </div>

        <div className="grid w-full gap-2 sm:w-72">
          <PreviewTile
            icon={<Sun className="size-3.5 text-amber-500" aria-hidden />}
            title={labels.am}
            hint={labels.amHint}
          />
          <PreviewTile
            icon={<Moon className="size-3.5 text-indigo-500" aria-hidden />}
            title={labels.pm}
            hint={labels.pmHint}
          />
          <PreviewTile
            icon={<Shield className="size-3.5 text-emerald-500" aria-hidden />}
            title={labels.safety}
            hint=""
            tone="muted"
          />
        </div>
      </div>
    </section>
  );
}

function PreviewTile({
  icon,
  title,
  hint,
  tone = "card",
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  tone?: "card" | "muted";
}) {
  return (
    <div
      className={
        tone === "card"
          ? "flex items-center gap-2.5 rounded-xl border bg-card/70 px-3 py-2 shadow-sm backdrop-blur"
          : "flex items-center gap-2.5 rounded-xl border border-dashed bg-background/40 px-3 py-2 text-xs text-muted-foreground"
      }
    >
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-background/80 ring-1 ring-border/60">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold leading-tight">{title}</p>
        {hint ? (
          <p className="mt-0.5 line-clamp-1 text-[11px] leading-snug text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </div>
      {tone === "card" ? (
        <Droplet className="size-3 text-muted-foreground/50" aria-hidden />
      ) : null}
    </div>
  );
}
