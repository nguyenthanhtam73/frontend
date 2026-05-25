"use client";

import { Droplet, Loader2, Moon, Shield, Sparkles, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * First-run state. Two goals:
 *   1. Make AI Suggest the obvious next action (one big primary button).
 *   2. Reassure the user this won't auto-write a routine — they review first.
 *
 * The "mock" preview cards on the side are static SVG-style icons, not real
 * data. They give the page presence and hint at what's coming.
 */
export function EmptyHero({
  suggesting,
  onSuggest,
  labels,
}: {
  suggesting: boolean;
  onSuggest: () => void;
  labels: {
    title: string;
    body: string;
    cta: string;
    loading: string;
    or: string;
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
      {/* Decorative glow blobs — purely visual, hidden from AT. */}
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
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-background/80 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider text-primary">
            <Sparkles className="size-3" aria-hidden />
            DaDiary
          </span>
          <h2 className="text-xl font-semibold leading-tight tracking-tight sm:text-2xl">
            {labels.title}
          </h2>
          <p className="max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            {labels.body}
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Button
              type="button"
              size="lg"
              className="h-12 min-h-12 w-full text-sm sm:w-auto sm:text-base"
              onClick={onSuggest}
              disabled={suggesting}
            >
              {suggesting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  <span>{labels.loading}</span>
                </>
              ) : (
                <>
                  <Sparkles className="size-4" aria-hidden />
                  <span>{labels.cta}</span>
                </>
              )}
            </Button>
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {labels.or}
            </span>
          </div>
        </div>

        {/* Mini preview tiles — no real data, just sets the visual rhythm so
            the user can imagine the page filled out. */}
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
