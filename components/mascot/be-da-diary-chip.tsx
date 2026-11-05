"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import { useRouter } from "@/i18n/navigation";
import { gameRoomView } from "@/lib/mascot/game/room-view";
import {
  DEFAULT_GAME_LOOK,
  GAME_LOOK_KEY,
  gameDress,
  readGameLook,
  type GameLook,
} from "@/lib/mascot/game/look";
import { useBeDaView } from "@/lib/hooks/use-mascot";

function storedLook(): GameLook {
  if (typeof window === "undefined") return DEFAULT_GAME_LOOK;
  return readGameLook(localStorage) ?? DEFAULT_GAME_LOOK;
}

function fieldFocused(): boolean {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return false;
  return !!active.closest("input, textarea, select, [contenteditable='true']");
}

function sheetOpen(): boolean {
  // Only a real modal covers the page. The install hint is a non-modal dialog
  // and must not hide Bé Da.
  return !!document.querySelector("[role='dialog'][aria-modal='true'], [role='alertdialog']");
}

/**
 * Floating Bé Da for the skin diary. She is fixed to the corner, so the
 * header lays out as if she were not there, and she steps aside for a modal.
 */
export function BeDaDiaryChip() {
  const t = useTranslations("mascot");
  const locale = useLocale();
  const router = useRouter();
  const { view, hidden } = useBeDaView();
  const [look, setLook] = useState<GameLook>(DEFAULT_GAME_LOOK);
  const [quiet, setQuiet] = useState(false);
  const [paused, setPaused] = useState(false);
  const [scrolling, setScrolling] = useState(false);
  const room = gameRoomView(view);
  const dozing = room.mood === "sleepy";

  useEffect(() => {
    const read = () => setLook(storedLook());
    read();
    const onStore = (event: StorageEvent) => {
      if (event.key != null && event.key !== GAME_LOOK_KEY) return;
      read();
    };
    const onHide = () => setPaused(document.hidden);
    onHide();
    window.addEventListener("focus", read);
    window.addEventListener("storage", onStore);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("focus", read);
      window.removeEventListener("storage", onStore);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  useEffect(() => {
    if (hidden) return;
    const sync = () => setQuiet(fieldFocused() || sheetOpen());
    sync();
    document.addEventListener("focusin", sync);
    document.addEventListener("focusout", sync);
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["role"] });
    return () => {
      document.removeEventListener("focusin", sync);
      document.removeEventListener("focusout", sync);
      observer.disconnect();
    };
  }, [hidden]);

  useEffect(() => {
    if (hidden) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;
    const scrollingNow = { current: false };
    let timer = 0;
    const onScroll = () => {
      if (!scrollingNow.current) {
        scrollingNow.current = true;
        setScrolling(true);
      }
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        scrollingNow.current = false;
        setScrolling(false);
      }, 1000);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
    };
  }, [hidden]);

  if (hidden) return null;

  return (
    <button
      type="button"
      data-testid="be-da-diary-chip"
      data-quiet={quiet ? "true" : "false"}
      data-scrolling={scrolling ? "true" : "false"}
      aria-label={t("homeAria")}
      aria-hidden={quiet ? true : undefined}
      tabIndex={quiet ? -1 : 0}
      onClick={() => {
        if (quiet) return;
        router.push("/be-da");
      }}
      className={[
        "be-da-diary-chip",
        quiet ? "is-quiet" : "",
        dozing ? "is-dozing" : "",
        paused ? "is-paused" : "",
        scrolling ? "is-scrolling" : "",
      ].filter(Boolean).join(" ")}
    >
      {dozing ? (
        <span className="be-da-chip-zzz" aria-hidden>
          <i>z</i>
          <i>z</i>
          <i>Z</i>
        </span>
      ) : (
        <span className="be-da-diary-bubble">{t("diaryHello")}</span>
      )}
      <span className="be-da-chip-wave">
        <BeDaFigure view={room} locale={locale} dress={gameDress(look)} className="w-full" />
      </span>
    </button>
  );
}
