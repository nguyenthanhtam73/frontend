"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLocale } from "next-intl";

import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

type AppLocale = (typeof routing.locales)[number];

type BridgeContextValue = {
  beginLocaleCrossfade: (target: AppLocale) => void;
  isLocaleSwitching: boolean;
};

const LocaleNavigationBridgeContext = createContext<BridgeContextValue | null>(null);

export function useBeginLocaleCrossfade() {
  const ctx = useContext(LocaleNavigationBridgeContext);
  const begin = ctx?.beginLocaleCrossfade;

  return useCallback(
    (target: AppLocale) => {
      begin?.(target);
    },
    [begin],
  );
}

export function useIsLocaleSwitching() {
  return useContext(LocaleNavigationBridgeContext)?.isLocaleSwitching ?? false;
}

/** Fade-out duration after the locale has committed. */
const FADE_OUT_MS = 220;
/** How long to keep the veil up after locale commit so RSC has time to paint. */
const HOLD_AFTER_COMMIT_MS = 110;
/** Hard cap so the veil never gets stuck even if navigation fails. */
const FAILSAFE_MS = 4000;

type Phase = "gone" | "in" | "out";

/**
 * Veil is rendered with `opacity-100` on first commit (no fade-in) so it covers
 * the page in the same paint as the click — eliminates the flash window where
 * RSC could swap before the cover is visible. Only the exit fades out.
 */
function LocaleBackdrop({ visible }: { visible: boolean }) {
  const [phase, setPhase] = useState<Phase>("gone");

  useEffect(() => {
    if (visible) {
      setPhase("in");
      return;
    }
    let timer: number | undefined;
    setPhase((prev) => {
      if (prev === "gone") return "gone";
      timer = window.setTimeout(() => setPhase("gone"), FADE_OUT_MS);
      return "out";
    });
    return () => {
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [visible]);

  if (phase === "gone") return null;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-auto fixed inset-0 z-40 isolate",
        "bg-background/60 supports-backdrop-filter:bg-background/45 supports-backdrop-filter:backdrop-blur-sm",
        "motion-safe:transition-opacity motion-safe:duration-220 motion-safe:ease-out",
        "motion-reduce:duration-100",
        phase === "in" ? "opacity-100" : "opacity-0",
      )}
      style={{ willChange: "opacity" }}
    />
  );
}

export function LocaleNavigationBridge({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const [veilOpen, setVeilOpen] = useState(false);
  const expectedRef = useRef<AppLocale | null>(null);
  const holdTimerRef = useRef<number | undefined>(undefined);
  const failSafeTimerRef = useRef<number | undefined>(undefined);

  const clearTimers = useCallback(() => {
    if (holdTimerRef.current !== undefined) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = undefined;
    }
    if (failSafeTimerRef.current !== undefined) {
      clearTimeout(failSafeTimerRef.current);
      failSafeTimerRef.current = undefined;
    }
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const settleVeil = useCallback(() => {
    expectedRef.current = null;
    clearTimers();
    setVeilOpen(false);
  }, [clearTimers]);

  const beginLocaleCrossfade = useCallback(
    (target: AppLocale) => {
      if (locale === target) return;
      clearTimers();
      expectedRef.current = target;
      setVeilOpen(true);
      failSafeTimerRef.current = window.setTimeout(settleVeil, FAILSAFE_MS);
    },
    [locale, settleVeil, clearTimers],
  );

  useEffect(() => {
    const want = expectedRef.current;
    if (!veilOpen || want === null || locale !== want) return;

    if (failSafeTimerRef.current !== undefined) {
      clearTimeout(failSafeTimerRef.current);
      failSafeTimerRef.current = undefined;
    }

    if (holdTimerRef.current !== undefined) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = window.setTimeout(settleVeil, HOLD_AFTER_COMMIT_MS);

    return () => {
      if (holdTimerRef.current !== undefined) {
        clearTimeout(holdTimerRef.current);
        holdTimerRef.current = undefined;
      }
    };
  }, [veilOpen, locale, settleVeil]);

  const value = useMemo(
    () => ({
      beginLocaleCrossfade,
      isLocaleSwitching: veilOpen,
    }),
    [beginLocaleCrossfade, veilOpen],
  );

  return (
    <LocaleNavigationBridgeContext.Provider value={value}>
      <LocaleBackdrop visible={veilOpen} />
      {children}
    </LocaleNavigationBridgeContext.Provider>
  );
}
