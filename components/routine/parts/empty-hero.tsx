"use client";

import { ArrowDown, Droplet, Moon, Shield, Sun } from "lucide-react";

/**
 * First-run hero when the user has no routine at all yet.
 */
export function EmptyHero({
  beginnerSimple,
  labels,
}: {
  beginnerSimple: boolean;
  labels: {
    title: string;
    body: string;
    beginnerBody: string;
    scrollHint: string;
    am: string;
    pm: string;
    amHint: string;
    pmHint: string;
    safety: string;
  };
}) {
  const body = beginnerSimple ? labels.beginnerBody : labels.body;

  return (
    <section
      aria-label={labels.title}
      className="relative overflow-hidden rounded-3xl border border-primary/25 bg-linear-to-br from-primary/12 via-accent/35 to-background p-5 shadow-sm sm:p-8 in-animate animate-in fade-in slide-in-from-bottom-2 duration-300"
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
            {body}
          </p>
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/70 px-3 py-2 text-xs font-medium text-primary lg:hidden">
            <ArrowDown className="size-3.5 animate-bounce" aria-hidden />
            {labels.scrollHint}
          </p>
        </div>

        <div className="grid w-full gap-2 sm:w-72">
          <PreviewTile
            icon={<Sun className="size-4 text-amber-500" aria-hidden />}
            title={labels.am}
            hint={labels.amHint}
          />
          <PreviewTile
            icon={<Moon className="size-4 text-indigo-500" aria-hidden />}
            title={labels.pm}
            hint={labels.pmHint}
          />
          <PreviewTile
            icon={<Shield className="size-4 text-emerald-500" aria-hidden />}
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
          ? "flex items-center gap-3 rounded-xl border bg-card/70 px-3 py-2.5 shadow-sm backdrop-blur"
          : "flex items-center gap-3 rounded-xl border border-dashed bg-background/40 px-3 py-2.5 text-xs text-muted-foreground"
      }
    >
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-background/80 ring-1 ring-border/60">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-tight sm:text-xs">{title}</p>
        {hint ? (
          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground sm:text-[11px]">
            {hint}
          </p>
        ) : null}
      </div>
      {tone === "card" ? (
        <Droplet className="size-3.5 text-muted-foreground/50" aria-hidden />
      ) : null}
    </div>
  );
}
