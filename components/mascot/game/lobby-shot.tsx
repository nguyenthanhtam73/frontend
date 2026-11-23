"use client";

import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";

import { BeDaGameView } from "@/components/mascot/game/be-da-game-view";
import { DEFAULT_GAME_LOOK } from "@/lib/mascot/game/look";
import { defaultSnapshot, resolveBeDaView } from "@/lib/mascot/model";
import vi from "../../../messages/vi.json";
import "@/components/mascot/game/be-da-game.css";

const client = new QueryClient();

export function LobbyShot() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(new URLSearchParams(window.location.search).get("open") === "1");
  }, []);
  const player = resolveBeDaView({
    snapshot: { ...defaultSnapshot(), isDefault: false, mood: "happy" },
    missedDays: 0,
    sessionHappy: false,
    locale: "vi",
  });
  return (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale="vi" messages={vi} timeZone="Asia/Ho_Chi_Minh">
        <BeDaGameView
          locale="vi"
          tab="lobby"
          sky="morning"
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
          giftTaken
          player={player}
          burst={0}
          homeHref="/check-in"
          onTab={() => undefined}
          onToggleSound={() => undefined}
          onSelectFriend={() => undefined}
          onFriendAction={() => undefined}
          onClaim={() => undefined}
          onLook={() => true}
          activeRoom={{ code: "2W8BX8", name: "2W8BX8", endsAt: "2026-11-30T17:00:00.000Z" }}
          hall={1}
          hallCount={4}
          hallCap={28}
        />
        {open ? <LobbyOpen /> : null}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );
}

function LobbyOpen() {
  useEffect(() => {
    document.querySelector<HTMLButtonElement>("[data-testid=beda-current-room]")?.click();
  }, []);
  return null;
}
