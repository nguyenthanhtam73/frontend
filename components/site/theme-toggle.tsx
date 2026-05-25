"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type Mode = "light" | "dark";

/** Snappy eased orbit — avoids feeling “sticky” vs linear ease */
const EASE_SPRING = "cubic-bezier(0.34, 1.35, 0.64, 1)";
const ICON_T_MS = 260;

export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations("common.theme");
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || theme !== "system") return;
    setTheme(resolvedTheme === "dark" ? "dark" : "light");
  }, [mounted, theme, resolvedTheme, setTheme]);

  if (!mounted) {
    return (
      <div
        className={cn(
          "inline-flex h-8 min-h-8 min-w-[2.85rem] shrink-0 cursor-default items-center gap-1 rounded-lg border border-border bg-background px-1.5 sm:min-w-[5rem]",
          className,
        )}
        aria-busy="true"
        aria-label={t("label")}
      >
        <span className="relative grid size-6 shrink-0 place-items-center" aria-hidden>
          <span className="absolute inset-[15%] rounded-full bg-muted/70" />
        </span>
        <span className="hidden min-h-3 min-w-[2.5rem] rounded-sm bg-muted/60 sm:block" aria-hidden />
      </div>
    );
  }

  const explicit: Mode | null = theme === "light" || theme === "dark" ? theme : null;
  const active: Mode = explicit ?? (resolvedTheme === "dark" ? "dark" : "light");

  const isLight = active === "light";

  const label = `${t("label")}: ${t(active)}`;

  const labelMotionIdle = cn(
    "motion-safe:transition-[opacity,transform] motion-safe:duration-[260ms] motion-safe:ease-[cubic-bezier(0.34,1.35,0.64,1)] motion-reduce:transition-none motion-reduce:duration-0",
  );

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={() => setTheme(active === "light" ? "dark" : "light")}
      className={cn(
        "group/theme-toggle relative isolate inline-flex h-8 min-h-8 min-w-[2.85rem] shrink-0 cursor-pointer items-center gap-1 overflow-visible rounded-lg border border-border bg-background px-1.5 text-[11px] font-medium text-muted-foreground transition-[color,background-color,border-color,box-shadow] duration-200 hover:bg-muted hover:text-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 sm:min-w-[5rem] sm:text-xs",
        className,
      )}
    >
      <span
        className="relative grid size-6 shrink-0 place-items-center rounded-full bg-linear-to-br from-muted/50 to-transparent motion-reduce:from-muted/35 motion-reduce:to-transparent"
        aria-hidden
      >
        {/* Ambient halo: warm day → cool night */}
        <span
          className={cn(
            "pointer-events-none absolute inset-0 rounded-full blur-[8px]",
            "motion-safe:transition-[opacity,transform,background-color] motion-safe:duration-[260ms] motion-safe:ease-[cubic-bezier(0.34,1.35,0.64,1)] motion-reduce:transition-none",
            isLight ? "scale-100 bg-amber-400/55 opacity-90" : "scale-125 bg-indigo-500/45 opacity-100 dark:bg-sky-600/38",
          )}
        />

        <Sun
          strokeWidth={2}
          className={cn(
            "absolute z-[5] text-amber-500 drop-shadow-[0_0_8px_oklab(82%_0.12_95/0.35)] motion-reduce:drop-shadow-none",
            "motion-safe:transition-[opacity,transform,filter] motion-safe:duration-[260ms] motion-safe:ease-[cubic-bezier(0.34,1.35,0.64,1)] motion-reduce:transition-none",
            "size-[1rem]",
            isLight
              ? "rotate-0 scale-100 opacity-100 blur-none"
              : "rotate-[-110deg] scale-[0.35] opacity-0 blur-[1.5px] motion-reduce:blur-none motion-reduce:opacity-0",
          )}
        />

        <Moon
          strokeWidth={2}
          className={cn(
            "absolute z-[5] text-sky-300 drop-shadow-[0_0_7px_oklab(78%_0.09_260/0.42)] motion-reduce:drop-shadow-none dark:text-sky-200",
            "motion-safe:transition-[opacity,transform,filter] motion-safe:duration-[260ms] motion-safe:ease-[cubic-bezier(0.34,1.35,0.64,1)] motion-reduce:transition-none",
            "size-[0.9375rem]",
            isLight
              ? "rotate-110 scale-[0.35] opacity-0 blur-[1.5px] motion-reduce:blur-none motion-reduce:opacity-0"
              : "rotate-0 scale-100 opacity-100 blur-none",
          )}
        />

        <span
          className={cn(
            "pointer-events-none absolute inset-0 z-[6]",
            "motion-safe:transition-opacity motion-safe:duration-[260ms] motion-safe:ease-[cubic-bezier(0.34,1.35,0.64,1)] motion-reduce:transition-none",
            isLight ? "opacity-0" : "opacity-100",
          )}
        >
          <span className="theme-toggle-star-a absolute left-px top-0.5 size-[3px] rounded-full bg-white/95 shadow-[0_0_4px_rgb(226,232,240)] dark:bg-white/90" />
          <span className="theme-toggle-star-b absolute top-[5px] right-1 size-0.5 rounded-full bg-sky-50/95 shadow-[0_0_3px_rgb(147,197,253)] dark:bg-white/88" />
          <span className="theme-toggle-star-c absolute bottom-1 left-2 size-[2.5px] rounded-full bg-sky-100/95 shadow-[0_0_3px_rgb(186,230,253)] dark:bg-white/82" />
        </span>
      </span>

      <span className="relative hidden min-h-4 min-w-10 overflow-hidden pt-px sm:inline-block">
        <span
          className={cn(
            "block whitespace-nowrap",
            labelMotionIdle,
            isLight
              ? "translate-y-0 opacity-100 motion-reduce:translate-y-0 motion-reduce:opacity-100"
              : "pointer-events-none absolute inset-0 translate-y-[110%] opacity-0 motion-reduce:pointer-events-none motion-reduce:opacity-0",
          )}
          style={{ transitionDuration: `${ICON_T_MS}ms`, transitionTimingFunction: EASE_SPRING }}
          aria-hidden
        >
          {t("light")}
        </span>
        <span
          className={cn(
            "block whitespace-nowrap",
            labelMotionIdle,
            isLight
              ? "pointer-events-none absolute inset-0 translate-y-[-110%] opacity-0 motion-reduce:pointer-events-none motion-reduce:opacity-0"
              : "translate-y-0 opacity-100 motion-reduce:translate-y-0 motion-reduce:opacity-100",
          )}
          style={{ transitionDuration: `${ICON_T_MS}ms`, transitionTimingFunction: EASE_SPRING }}
          aria-hidden
        >
          {t("dark")}
        </span>
      </span>

      <span
        className="pointer-events-none absolute inset-0 rounded-lg bg-linear-to-r from-transparent via-primary/10 to-transparent opacity-0 transition-opacity duration-[420ms] group-hover/theme-toggle:opacity-100 motion-reduce:hidden motion-reduce:opacity-0"
        aria-hidden
      />
    </button>
  );
}
