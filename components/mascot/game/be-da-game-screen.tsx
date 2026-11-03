"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";

import { BeDaGameView, type GameTab, type GameToast } from "@/components/mascot/game/be-da-game-view";
import { useRouter } from "@/i18n/navigation";
import { apiGet } from "@/lib/api-client";
import { fetchMascot, mascotQueryKey } from "@/lib/api/mascot";
import { getAccessToken } from "@/lib/auth-token";
import { useBeDaView } from "@/lib/hooks/use-mascot";
import { useStreak } from "@/lib/hooks/use-streak";
import { countRoutineTicks, formatGameCoins, gameCoinCount } from "@/lib/mascot/game/coins";
import { useLobbyPresence } from "@/components/mascot/game/use-lobby-presence";
import { useSpaRoom } from "@/components/mascot/game/use-spa-room";
import { localePath } from "@/lib/mascot/game/path";
import {
  GAME_CHEST_KEY,
  GAME_WAVE_KEY,
  readDayFlag,
  readSoundEnabled,
  writeDayFlag,
  writeSoundEnabled,
} from "@/lib/mascot/game/prefs";
import { chestHearts, chestReady, checkedInOnDay, gameBubbleKind, gameQuests } from "@/lib/mascot/game/quests";
import { skyPeriod } from "@/lib/mascot/game/sky";
import {
  DEFAULT_GAME_LOOK,
  readGameLook,
  writeGameLook,
  type GameLook,
} from "@/lib/mascot/game/look";
import { playGameTing } from "@/lib/mascot/game/sound";
import { gameRoomView } from "@/lib/mascot/game/room-view";
import { createSpaRoom, spaProblemFromError } from "@/lib/mascot/game/spa-room-api";
import {
  SPA_TAB_KEY,
  normalizeRoomCode,
  roomInvitePath,
  type SpaNotice,
} from "@/lib/mascot/game/spa-room";
import { accessoryUnlocked } from "@/lib/mascot/glow";
import { useAuthStore } from "@/lib/stores/auth-store";
import { streakDateKey } from "@/lib/streak/history";
import type { RoutineDTO } from "@/lib/types/routine";

import "@/components/mascot/game/be-da-game.css";

export function BeDaGameScreen({ roomCode = null }: { roomCode?: string | null }) {
  const locale = useLocale();
  const router = useRouter();
  const code = roomCode ? normalizeRoomCode(roomCode) : null;
  const inSpa = roomCode != null;
  const today = streakDateKey();
  const user = useAuthStore((s) => s.user);
  const hasAuth = !!user || !!getAccessToken();
  const { view: homeView } = useBeDaView();
  const view = useMemo(() => gameRoomView(homeView), [homeView]);
  const streak = useStreak();
  const mascotQuery = useQuery({
    queryKey: mascotQueryKey,
    queryFn: fetchMascot,
    enabled: hasAuth,
    staleTime: 30_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const routineQuery = useQuery({
    queryKey: ["game-routine-today"],
    queryFn: () => apiGet<RoutineDTO>("/api/v1/routines", { toastOnError: false }),
    enabled: hasAuth,
    staleTime: 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const [tab, setTab] = useState<GameTab>("care");
  const [soundOn, setSoundOn] = useState(true);
  const [waved, setWaved] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [ready, setReady] = useState(false);
  const [chestDismissed, setChestDismissed] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState("keo-deo");
  const [createProblem, setCreateProblem] = useState<SpaNotice>(null);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [toast, setToast] = useState<GameToast>(null);
  const [look, setLook] = useState<GameLook>(DEFAULT_GAME_LOOK);
  const [burst, setBurst] = useState(0);
  const soundRef = useRef(true);
  const autoChest = useRef(false);
  soundRef.current = soundOn;

  useEffect(() => {
    setSoundOn(readSoundEnabled(localStorage));
    const savedLook = readGameLook(localStorage);
    if (savedLook) setLook(savedLook);
    setWaved(readDayFlag(localStorage, GAME_WAVE_KEY, today));
    setClaimed(readDayFlag(localStorage, GAME_CHEST_KEY, today));
    setReady(true);
    const root = document.documentElement;
    const prevHtml = root.style.overflow;
    const prevBody = document.body.style.overflow;
    root.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.dataset.bedaGame = "on";
    return () => {
      delete document.body.dataset.bedaGame;
      root.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, [today]);

  const morning = routineQuery.data?.morning ?? [];
  const evening = routineQuery.data?.evening ?? [];
  const routineToday = mascotQuery.data?.routineToday ?? null;
  const quests = gameQuests({ morning, routineToday, wavedToday: waved });
  const canChest = chestReady(quests, claimed);

  useEffect(() => {
    if (roomCode) return;
    let saved: string | null = null;
    try {
      saved = sessionStorage.getItem(SPA_TAB_KEY);
    } catch {
      return;
    }
    if (saved !== "lobby" && saved !== "care" && saved !== "wardrobe" && saved !== "quests") return;
    setTab(saved);
    const id = window.setTimeout(() => {
      try {
        sessionStorage.removeItem(SPA_TAB_KEY);
      } catch {
        /* ignore */
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [roomCode]);

  useEffect(() => {
    if (!ready || autoChest.current || !canChest || roomCode) return;
    autoChest.current = true;
    setTab("quests");
  }, [ready, canChest, roomCode]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(id);
  }, [toast]);

  const presence = useLobbyPresence({
    active: tab === "lobby" && !inSpa,
    look,
    onRemoteEmote: (event) => {
      setToast(event);
      setBurst((n) => n + 1);
      playGameTing(soundRef.current);
    },
  });
  const spaRoom = useSpaRoom({
    active: code != null,
    code,
    look,
    onRemoteEmote: (event) => {
      setToast(event);
      setBurst((n) => n + 1);
      playGameTing(soundRef.current);
    },
  });

  useEffect(() => {
    if (!code || !spaRoom.serverCode || spaRoom.serverCode === code) return;
    router.replace(roomInvitePath(spaRoom.serverCode));
  }, [code, router, spaRoom.serverCode]);

  function feedback() {
    setBurst((n) => n + 1);
    playGameTing(soundRef.current);
  }

  function onTab(next: GameTab) {
    feedback();
    if (next === "quests") {
      setChestDismissed(false);
      setTab("quests");
      return;
    }
    if (next === "lobby") setChestDismissed(true);
    if (next === "care") setChestDismissed(true);
    setTab(next);
  }

  function onToggleSound() {
    const next = !soundRef.current;
    writeSoundEnabled(localStorage, next);
    setSoundOn(next);
    if (next) playGameTing(true);
  }

  function leaveSpa(next: GameTab) {
    try {
      sessionStorage.setItem(SPA_TAB_KEY, next);
    } catch {
      /* the route change still leaves the room */
    }
    router.push("/be-da");
  }

  async function createRoom() {
    if (creatingRoom) return;
    setCreatingRoom(true);
    setCreateProblem(null);
    try {
      const created = await createSpaRoom();
      const next = normalizeRoomCode(created.code);
      if (!next) {
        setCreateProblem("offline");
        return;
      }
      router.push(roomInvitePath(next));
    } catch (err) {
      setCreateProblem(spaProblemFromError(err));
    } finally {
      setCreatingRoom(false);
    }
  }

  function onFriendAction(kind: "wave" | "heart" | "outfit") {
    if (inSpa) {
      const guest = spaRoom.guests.find((item) => item.id === selectedFriendId);
      if (!guest) return;
      feedback();
      setToast({ name: guest.nickname, kind });
      spaRoom.emote(guest, kind);
      return;
    }
    const friend = presence.actors.find((item) => item.id === selectedFriendId);
    if (!friend) return;
    feedback();
    setToast({ name: friend.nickname, kind });
    presence.emote(friend, kind);
    if (kind !== "wave") return;
    if (waved) return;
    writeDayFlag(localStorage, GAME_WAVE_KEY, today);
    setWaved(true);
    const next = gameQuests({ morning, routineToday, wavedToday: true });
    if (chestReady(next, claimed)) {
      setChestDismissed(false);
      setTab("quests");
    }
  }

  function onClaim() {
    feedback();
    writeDayFlag(localStorage, GAME_CHEST_KEY, today);
    setClaimed(true);
    setChestDismissed(true);
    setTab("care");
  }

  const checkedIn =
    checkedInOnDay(mascotQuery.data?.lastCheckinAt, today) ||
    checkedInOnDay(streak.data?.last_check_in_date, today);
  const coinsKnown = mascotQuery.isSuccess || mascotQuery.isError;
  const coinsLabel = coinsKnown
    ? formatGameCoins(
        gameCoinCount({
          glowPoints: mascotQuery.data?.glowPoints ?? null,
          routineTicks: countRoutineTicks(morning, evening, routineToday),
          checkedInToday: checkedIn,
        }),
        locale,
      )
    : "…";
  const streakLabel = streak.isSuccess ? String(streak.data?.current_streak ?? 0) : "…";

  const wornIds = useMemo(() => {
    const ids = [view.loadout.outfit.id, view.loadout.hair.id];
    for (const item of view.loadout.accessories) {
      const shop = item.source === "shop" || view.shopItemIds.includes(item.id);
      if (accessoryUnlocked(item.id, view.glowLevel, shop)) ids.push(item.id);
    }
    return ids;
  }, [view]);

  const chestOpen =
    ready && canChest && !chestDismissed && !inSpa && tab !== "lobby" && tab !== "wardrobe";

  return (
    <BeDaGameView
      locale={locale}
      tab={tab}
      sky={skyPeriod(new Date())}
      coinsLabel={coinsLabel}
      streakLabel={streakLabel}
      soundOn={soundOn}
      quests={quests}
      bubbleKind={gameBubbleKind(quests)}
      progress={view.glowProgress}
      showPrettyLine={view.glowProgress != null || view.nearLevelUp}
      chestOpen={chestOpen}
      friendCount={presence.count}
      selectedFriendId={selectedFriendId}
      toast={toast}
      wavingId={null}
      actors={presence.actors}
      you={presence.you}
      hall={presence.hall}
      hallCount={presence.count}
      hallCap={presence.cap}
      hallFull={presence.full}
      nextHall={presence.nextHall}
      lobbyLive={presence.live}
      nicknameError={presence.nicknameError}
      onHide={(id) => {
        if (inSpa) spaRoom.hide(id);
        else presence.hide(id);
        if (id === selectedFriendId) setSelectedFriendId("");
      }}
      onWalk={presence.walkTo}
      onNickname={presence.setNickname}
      onSwitchHall={presence.switchHall}
      look={look}
      wornIds={wornIds}
      hearts={chestHearts(quests)}
      streakKept={(streak.data?.current_streak ?? 0) > 0 || checkedIn}
      giftTaken={claimed}
      player={view}
      burst={burst}
      homeHref={localePath(locale, "/check-in")}
      routineHref={localePath(locale, "/routine")}
      onTab={(next) => {
        if (inSpa) {
          leaveSpa(next);
          return;
        }
        onTab(next);
      }}
      onToggleSound={onToggleSound}
      spa={
        inSpa
          ? {
              code: code ?? "",
              count: code ? spaRoom.count : 1,
              cap: spaRoom.cap,
              guests: code ? spaRoom.guests : [],
              notice: code ? spaRoom.notice : "bad-code",
            }
          : null
      }
      youPose={spaRoom.youPose}
      onCreateRoom={() => void createRoom()}
      creatingRoom={creatingRoom}
      createProblem={createProblem}
      onJoinRoom={(next) => router.push(roomInvitePath(next))}
      onLeaveSpa={() => leaveSpa("care")}
      onSpaLobby={() => leaveSpa("lobby")}
      onSelectFriend={setSelectedFriendId}
      onFriendAction={onFriendAction}
      onClaim={onClaim}
      onLook={(next) => {
        feedback();
        setLook(next);
        writeGameLook(localStorage, next);
      }}
    />
  );
}
