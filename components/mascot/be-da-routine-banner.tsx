"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { BeDaStage } from "@/components/mascot/be-da-stage";
import { useBeDaView } from "@/lib/hooks/use-mascot";
import { expiredItemKeys } from "@/lib/mascot/model";
import { useBeDaPoseStore } from "@/lib/mascot/pose-store";

const SEEN_KEY = "be-da-expired-items";

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

  if (hidden) return null;

  const line = expiryLine
    ? t("lines.itemExpired")
    : view.useServerLine
      ? view.serverLine
      : t(`lines.${view.lineKey}`);

  return (
    <section
      className="mb-3 rounded-2xl border border-rose-200/80 bg-rose-50/80 px-3 py-3"
      data-testid="be-da-routine"
      aria-label={t("name")}
    >
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-900/70">
        {t("name")}
      </p>
      <BeDaStage
        view={view}
        stepPose={stepPose}
        line={line}
        locale={locale}
        tidy={sessionHappy}
        fliesExit={fliesExit}
        celebrate={celebrate}
        glowCelebrate={glowCelebrate}
        interactive
        tapLabel={t("tap")}
      />
    </section>
  );
}
