"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type Mode = "light" | "dark";

const shell = cn(
  "theme-toggle-btn inline-flex h-11 min-h-11 shrink-0 items-center rounded-lg border border-border bg-background p-0.5",
  "cursor-pointer overflow-hidden text-left",
  "[appearance:none] [-webkit-appearance:none] [-webkit-tap-highlight-color:transparent]",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
);

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
      <div className={cn(shell, "cursor-default", className)} aria-busy="true" aria-label={t("label")}>
        <span className="inline-flex h-9 min-w-[4.5rem] items-center rounded-md bg-muted/60" aria-hidden />
      </div>
    );
  }

  const explicit: Mode | null = theme === "light" || theme === "dark" ? theme : null;
  const active: Mode = explicit ?? (resolvedTheme === "dark" ? "dark" : "light");
  const isLight = active === "light";
  const modeLabel = isLight ? t("light") : t("dark");
  const label = `${t("label")}: ${modeLabel}`;
  const Icon = isLight ? Sun : Moon;

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active === "dark"}
      onClick={() => setTheme(isLight ? "dark" : "light")}
      className={cn(shell, className)}
    >
      <span className="inline-flex max-w-full items-center gap-1 rounded-md bg-primary px-2 py-1 text-[11px] font-medium leading-none text-primary-foreground sm:text-xs">
        <Icon className="size-4 shrink-0" strokeWidth={2} aria-hidden />
        <span className="whitespace-nowrap">{modeLabel}</span>
      </span>
    </button>
  );
}
