"use client";

import { useLayoutEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { BeDaFigure } from "@/components/mascot/be-da-figure";
import { useRouter } from "@/i18n/navigation";
import { gameRoomView, roomNeglect } from "@/lib/mascot/game/room-view";
import { useBeDaView } from "@/lib/hooks/use-mascot";
import type { BeDaView } from "@/lib/mascot/model";

const TAP_MS = 480;

/** Awake chip stays happy. Neglect uses the room's sleepy face, without sad props. */
function chipView(view: BeDaView, dozing: boolean): BeDaView {
  if (dozing) return gameRoomView(view);
  return {
    ...view,
    mood: "happy",
    lineKey: "happy",
    useServerLine: false,
    flies: false,
    sign: "comeBack",
    disheveled: 0,
    loadout: { ...view.loadout, roomItems: [] },
  };
}

/** Small corner Bé Da on /routine. Tap opens the room. */
export function BeDaRoutineBanner() {
  const t = useTranslations("mascot");
  const locale = useLocale();
  const router = useRouter();
  const { view, hidden } = useBeDaView();
  const [tapped, setTapped] = useState(false);
  const dozing = roomNeglect(view);

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
          <BeDaFigure view={chipView(view, dozing)} locale={locale} className="w-full" />
        </span>
      </span>
    </button>
  );
}
