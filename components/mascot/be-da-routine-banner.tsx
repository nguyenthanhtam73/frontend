"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import { BeDaGlowNote } from "@/components/mascot/be-da-glow-note";
import { Link } from "@/i18n/navigation";
import { useBeDaView } from "@/lib/hooks/use-mascot";
import { expiredItemKeys } from "@/lib/mascot/model";
import { useBeDaPoseStore } from "@/lib/mascot/pose-store";

const SEEN_KEY = "be-da-expired-items";

/** Compact corner chip on /routine. Tap opens Bé Da's room. */
export function BeDaRoutineBanner() {
  const t = useTranslations("mascot");
  const locale = useLocale();
  const { view, stepPose, hidden, glowCelebrate } = useBeDaView();
  const sessionHappy = useBeDaPoseStore((s) => s.sessionHappy);
  const [expiryLine, setExpiryLine] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [fliesExit, setFliesExit] = useState(false);
  const hadFlies = useRef(false);
  const wasHappy = useRef(false);

  const expired = expiredItemKeys(view.loadout).join("|");
  useEffect(() => {
    if (!expired || typeof window === "undefined") return;
    const keys = expired.split("|");
    let seen: string[] = [];
    try {
      const parsed = JSON.parse(window.localStorage.getItem(SEEN_KEY) || "[]");
      if (Array.isArray(parsed)) seen = parsed.filter((item) => typeof item === "string");
    } catch {
      seen = [];
    }
    const fresh = keys.filter((key) => !seen.includes(key));
    if (fresh.length === 0) return;
    window.localStorage.setItem(SEEN_KEY, JSON.stringify([...seen, ...fresh]));
    setExpiryLine(true);
  }, [expired]);

  useEffect(() => {
    if (view.flies) hadFlies.current = true;
    if (!wasHappy.current && sessionHappy) {
      setCelebrate(true);
      if (hadFlies.current) setFliesExit(true);
      const timer = window.setTimeout(() => {
        setCelebrate(false);
        setFliesExit(false);
        hadFlies.current = false;
      }, 800);
      wasHappy.current = true;
      return () => window.clearTimeout(timer);
    }
    if (!sessionHappy) wasHappy.current = false;
    return undefined;
  }, [sessionHappy, view.flies]);

  useLayoutEffect(() => {
    if (hidden) return;
    const page = document.querySelector("[data-routine-page]");
    if (!page) return;
    page.setAttribute("data-be-da", "on");
    return () => page.removeAttribute("data-be-da");
  }, [hidden]);

  if (hidden) return null;

  const line = expiryLine
    ? t("lines.itemExpired")
    : view.useServerLine
      ? view.serverLine
      : t(`lines.${view.lineKey}`);
  const spoken = line.trim() || t("lines.normal").trim();

  return (
    <Link
      href="/be-da"
      data-testid="be-da-routine"
      aria-label={t("routinePlayAria")}
      title={spoken}
      className="group absolute right-0 top-0 z-20 flex min-h-11 w-[7.5rem] flex-col items-center rounded-2xl border border-rose-200/80 bg-rose-50/95 px-2 py-1.5 text-rose-950 shadow-sm outline-none transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary active:translate-y-0 active:scale-[0.98] dark:border-rose-200/25 dark:bg-rose-950/90 dark:text-rose-50 dark:shadow-black/40 sm:w-32"
    >
      <span className="be-da-chip-spark pointer-events-none absolute right-2 top-2 size-2 rounded-full bg-rose-300 shadow-[0_0_0_3px_rgba(251,182,206,0.35)]" aria-hidden />
      <span className="be-da-chip-bob block w-14 sm:w-16">
        <BeDaFigure
          view={view}
          stepPose={stepPose}
          locale={locale}
          tidy={sessionHappy}
          fliesExit={fliesExit}
          celebrate={celebrate}
          glowCelebrate={glowCelebrate}
          className="w-full"
        />
      </span>
      <p className="line-clamp-1 w-full text-center text-[11px] font-semibold leading-tight" data-testid="be-da-line">
        {spoken}
      </p>
      <BeDaGlowNote view={view} celebrate={glowCelebrate} className="mt-0.5" />
      <p className="mt-0.5 text-center text-[10px] font-semibold leading-tight text-rose-700 group-hover:underline dark:text-rose-200">
        {t("routinePlay")}
      </p>
    </Link>
  );
}
