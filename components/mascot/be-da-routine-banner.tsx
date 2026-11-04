"use client";

import { useEffect, useLayoutEffect, useState } from "react";
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

const TAP_MS = 480;

function storedLook(): GameLook {
  if (typeof window === "undefined") return DEFAULT_GAME_LOOK;
  return readGameLook(localStorage) ?? DEFAULT_GAME_LOOK;
}

/** Small corner Bé Da on /routine. Same room view and closet as Góc bình yên. */
export function BeDaRoutineBanner() {
  const t = useTranslations("mascot");
  const locale = useLocale();
  const router = useRouter();
  const { view, hidden } = useBeDaView();
  const [look, setLook] = useState<GameLook>(DEFAULT_GAME_LOOK);
  const [tapped, setTapped] = useState(false);
  const room = gameRoomView(view);
  const dozing = room.mood === "sleepy";

  useEffect(() => {
    const read = () => setLook(storedLook());
    read();
    const onShow = () => {
      if (document.visibilityState === "hidden") return;
      read();
    };
    const onStore = (event: StorageEvent) => {
      if (event.key != null && event.key !== GAME_LOOK_KEY) return;
      read();
    };
    window.addEventListener("focus", read);
    document.addEventListener("visibilitychange", onShow);
    window.addEventListener("storage", onStore);
    return () => {
      window.removeEventListener("focus", read);
      document.removeEventListener("visibilitychange", onShow);
      window.removeEventListener("storage", onStore);
    };
  }, []);

  useLayoutEffect(() => {
    if (hidden) return;
    const page = document.querySelector("[data-routine-page]");
    if (!page) return;
    page.setAttribute("data-be-da", "on");
    return () => page.removeAttribute("data-be-da");
  }, [hidden]);

  if (hidden) return null;

  function openRoom() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || tapped) {
      router.push("/be-da");
      return;
    }
    setTapped(true);
    window.setTimeout(() => router.push("/be-da"), TAP_MS);
  }

  return (
    <button
      type="button"
      data-testid="be-da-routine"
      data-dozing={dozing ? "true" : "false"}
      data-outfit={look.outfit}
      aria-label={dozing ? t("routineDozingAria") : t("routinePlayAria")}
      onClick={openRoom}
      className={
        tapped
          ? "be-da-routine-chip is-tapped absolute right-0 top-0 z-20 flex min-h-11 items-end justify-center px-1 pb-1 pt-1 outline-none focus-visible:ring-2 focus-visible:ring-[#F6B8C8]"
          : dozing
            ? "be-da-routine-chip is-dozing absolute right-0 top-0 z-20 flex min-h-11 items-end justify-center px-1 pb-1 pt-1 outline-none focus-visible:ring-2 focus-visible:ring-[#F6B8C8]"
            : "be-da-routine-chip absolute right-0 top-0 z-20 flex min-h-11 items-end justify-center px-1 pb-1 pt-1 outline-none focus-visible:ring-2 focus-visible:ring-[#F6B8C8]"
      }
    >
      {dozing ? (
        <span className="be-da-chip-zzz" aria-hidden>
          <i>z</i>
          <i>z</i>
          <i>Z</i>
        </span>
      ) : (
        <span className="be-da-chip-bubbles">
          <span>{t("routineBubble1")}</span>
          <span>{t("routineBubble2")}</span>
        </span>
      )}
      <span className="be-da-chip-sparks" aria-hidden>
        <i />
        <i />
        <i />
      </span>
      <span className="be-da-chip-wave block w-20">
        <span className="be-da-chip-bob block">
          <BeDaFigure view={room} locale={locale} dress={gameDress(look)} className="w-full" />
        </span>
      </span>
    </button>
  );
}
