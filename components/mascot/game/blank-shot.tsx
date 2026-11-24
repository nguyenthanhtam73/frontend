"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";

import { BeDaGameView } from "@/components/mascot/game/be-da-game-view";
import { BeDaGameWait } from "@/components/mascot/game/be-da-game-gate";
import { BeDaPixiStage } from "@/components/mascot/game/be-da-pixi-stage";
import { DEFAULT_GAME_LOOK } from "@/lib/mascot/game/look";
import { defaultSnapshot, resolveBeDaView } from "@/lib/mascot/model";
import type { ShellSnapshot } from "@/lib/game/core/types";
import vi from "../../../messages/vi.json";

import "@/components/mascot/game/be-da-game.css";

const client = new QueryClient();

/** Local screenshots. The dev layout answers 404 in production. */
export function BlankShot() {
  const [scene, setScene] = useState("load");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setScene(params.get("scene") || "load");
    setTheme(params.get("theme") === "dark" ? "dark" : "light");
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    document.body.dataset.gameEmbed = "1";
    return () => {
      delete document.body.dataset.gameEmbed;
    };
  }, [theme]);
  const sky = theme === "dark" ? "night" : "morning";
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="vi" messages={vi} timeZone="Asia/Ho_Chi_Minh">
        {scene === "retry" ? <BeDaGameWait initialRetry /> : null}
        {scene === "load" ? <BeDaGameWait /> : null}
        {scene === "draw" ? <ForcedRoom sky={sky} hold /> : null}
        {scene === "room" || scene === "card" ? <ForcedRoom sky={sky} /> : null}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

function ForcedRoom({ sky, hold = false }: { sky: "morning" | "night"; hold?: boolean }) {
  const [fell, setFell] = useState(false);
  const player = resolveBeDaView({
    snapshot: { ...defaultSnapshot(), isDefault: false, mood: "happy" },
    missedDays: 0,
    sessionHappy: false,
    locale: "vi",
  });
  if (hold) {
    return (
      <BeDaGameView
        locale="vi"
        tab="care"
        sky={sky}
        coinsLabel="1.250"
        streakLabel="7"
        soundOn
        quests={[]}
        bubbleKind="washed"
        progress={null}
        showPrettyLine={false}
        chestOpen={false}
        friendCount={4}
        selectedFriendId=""
        toast={null}
        wavingId={null}
        look={DEFAULT_GAME_LOOK}
        wornIds={[]}
        hearts={0}
        streakKept
        giftTaken={false}
        player={player}
        burst={0}
        homeHref="/check-in"
        onTab={() => undefined}
        onToggleSound={() => undefined}
        onSelectFriend={() => undefined}
        onFriendAction={() => undefined}
        onClaim={() => undefined}
        onLook={() => true}
        holdFrame
      />
    );
  }
  if (!fell) {
    const snapshot = (): ShellSnapshot => ({ scene: "room", sky, sprites: [] });
    return (
      <BeDaPixiStage
        scene="room"
        art="shot"
        snapshot={snapshot}
        labels={{ current: null }}
        readyTimeoutMs={200}
        startShell={() => new Promise(() => undefined)}
        onError={() => setFell(true)}
      />
    );
  }
  return (
    <BeDaGameView
      locale="vi"
      tab="care"
      sky={sky}
      coinsLabel="1.250"
      streakLabel="7"
      soundOn
      quests={[]}
      bubbleKind="washed"
      progress={null}
      showPrettyLine={false}
      chestOpen={false}
      friendCount={4}
      selectedFriendId=""
      toast={null}
      wavingId={null}
      look={DEFAULT_GAME_LOOK}
      wornIds={[]}
      hearts={0}
      streakKept
      giftTaken={false}
      player={player}
      burst={0}
      homeHref="/check-in"
      onTab={() => undefined}
      onToggleSound={() => undefined}
      onSelectFriend={() => undefined}
      onFriendAction={() => undefined}
      onClaim={() => undefined}
      onLook={() => true}
      plainRoom
    />
  );
}
