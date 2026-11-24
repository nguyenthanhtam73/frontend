"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";

import { BeDaGameView, type GameTab, type GameToast } from "@/components/mascot/game/be-da-game-view";
import { XuShopScreen } from "@/components/mascot/game/be-da-xu-shop";
import { useRouter } from "@/i18n/navigation";
import { apiGet, apiPost } from "@/lib/api-client";
import { fetchMascot, mascotQueryKey } from "@/lib/api/mascot";
import { introResetHref } from "@/lib/mascot/intro";
import { getAccessToken } from "@/lib/auth-token";
import { useBeDaView } from "@/lib/hooks/use-mascot";
import { useStreak } from "@/lib/hooks/use-streak";
import { formatGameCoins, walletXu } from "@/lib/mascot/game/coins";
import { useLobbyPresence } from "@/components/mascot/game/use-lobby-presence";
import { useRoomShared } from "@/components/mascot/game/use-room-shared";
import { useRoomTree } from "@/components/mascot/game/use-room-tree";
import { useSpaRoom } from "@/components/mascot/game/use-spa-room";
import type { RoomEvent } from "@/lib/mascot/game/spa-room";
import { localePath } from "@/lib/mascot/game/path";
import {
  GAME_CHEST_EVENING_KEY,
  GAME_CHEST_MORNING_KEY,
  GAME_WAVE_KEY,
  chestClaimedSessions,
  readDayFlag,
  readSoundEnabled,
  writeDayFlag,
  writeSoundEnabled,
} from "@/lib/mascot/game/prefs";
import { routineSummary } from "@/lib/mascot/game/missions";
import { checkedInOnDay, gameBubbleKind, gameQuests } from "@/lib/mascot/game/quests";
import { skyPeriod } from "@/lib/mascot/game/sky";
import {
  DEFAULT_GAME_LOOK,
  genderLook,
  readGameLook,
  saveGameLook,
  type GameLook,
} from "@/lib/mascot/game/look";
import { mascotFeatureEnabled } from "@/lib/mascot/feature";
import { equippedGameLook } from "@/lib/mascot/game/wardrobe";
import { wearMascotClip, wearShopPiece } from "@/lib/mascot/game/mascot-wear";
import { pushLoiEvent } from "@/lib/mascot/loi-noi";
import { useLoiText, useOpenLoiLine } from "@/lib/mascot/use-loi-noi";
import { closetFromOwned, shopClosetItems, XU_SHOP_QUERY_KEY, getXuShop } from "@/lib/mascot/game/xu-shop";
import { isTreeWearClip } from "@/lib/mascot/game/room-tree";
import { playGameTing } from "@/lib/mascot/game/sound";
import { gameRoomView } from "@/lib/mascot/game/room-view";
import {
  createSpaRoom,
  listMySpaRooms,
  mergeSpaRoomCodes,
  readRememberedSpaRooms,
  rememberSpaRoom,
  roomLockFromError,
  spaProblemFromError,
} from "@/lib/mascot/game/spa-room-api";
import {
  SPA_TAB_KEY,
  normalizeRoomCode,
  pickActiveRoom,
  remainingRoomDays,
  roomInvitePath,
  type RoomClock,
  type SpaNotice,
} from "@/lib/mascot/game/spa-room";
import { accessoryUnlocked } from "@/lib/mascot/glow";
import { useAuthStore } from "@/lib/stores/auth-store";
import { isSessionComplete } from "@/lib/mascot/pose";
import { useBeDaPoseStore } from "@/lib/mascot/pose-store";
import { keepAffiliate } from "@/lib/routine/affiliate-link";
import { pendingChestSession, routineDayKey, sessionComplete, sessionOpen } from "@/lib/routine/session-window";
import { routineTickBody, routineTodayQueryKey } from "@/lib/routine/today-query";
import type { RoutineDTO, RoutineStepDTO } from "@/lib/types/routine";

import "@/components/mascot/game/be-da-game.css";
import "@/components/mascot/game/be-da-xu-shop.css";

const EMPTY_OWNED: readonly string[] = [];

export function BeDaGameScreen({ roomCode = null }: { roomCode?: string | null }) {
  const locale = useLocale();
  const router = useRouter();
  const queryClient = useQueryClient();
  const code = roomCode ? normalizeRoomCode(roomCode) : null;
  const inSpa = roomCode != null;
  const today = routineDayKey();
  const user = useAuthStore((s) => s.user);
  const closetAdmin = user?.is_admin === true;
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
  const ownedClipIds = useMemo(
    () => mascotQuery.data?.ownedItems.map((item) => item.id) ?? EMPTY_OWNED,
    [mascotQuery.data],
  );
  const [shopOpen, setShopOpen] = useState(false);
  const shopQuery = useQuery({
    queryKey: XU_SHOP_QUERY_KEY,
    queryFn: getXuShop,
    enabled: hasAuth && mascotFeatureEnabled(user),
    staleTime: 15_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
  const loiText = useLoiText();
  useOpenLoiLine({
    ready: !streak.isLoading && !mascotQuery.isLoading,
    missedDays: mascotQuery.data?.missedDays ?? null,
    streak: streak.data?.current_streak ?? null,
  });
  const shopCloset = useMemo(() => {
    if (shopQuery.data) return shopClosetItems(shopQuery.data);
    return closetFromOwned(mascotQuery.data?.ownedItems ?? []);
  }, [shopQuery.data, mascotQuery.data]);
  const routineQuery = useQuery({
    queryKey: routineTodayQueryKey,
    queryFn: () => apiGet<RoutineDTO>("/api/v1/routines", { toastOnError: false }),
    enabled: hasAuth,
    staleTime: 0,
    retry: 1,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });

  const [tab, setTab] = useState<GameTab>("care");
  const [soundOn, setSoundOn] = useState(true);
  const [waved, setWaved] = useState(false);
  const [claimedMorning, setClaimedMorning] = useState(false);
  const [claimedEvening, setClaimedEvening] = useState(false);
  const [ready, setReady] = useState(false);
  const [chestDismissed, setChestDismissed] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState("");
  const [createProblem, setCreateProblem] = useState<SpaNotice>(null);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [myRooms, setMyRooms] = useState<string[]>([]);
  const [roomLock, setRoomLock] = useState<RoomClock | null>(null);
  const [toast, setToast] = useState<GameToast>(null);
  const [look, setLook] = useState<GameLook>(DEFAULT_GAME_LOOK);
  const presented = useMemo(() => genderLook(look, view.gender), [look, view.gender]);
  const [wornLook, setWornLook] = useState<GameLook | null>(null);
  const [burst, setBurst] = useState(0);
  const soundRef = useRef(true);
  const autoChest = useRef<string | null>(null);
  soundRef.current = soundOn;

  useEffect(() => {
    setSoundOn(readSoundEnabled(localStorage));
    // A removed item stays in storage. The figure wears the default until they pick again.
    const stored = readGameLook(localStorage);
    const shown = equippedGameLook(stored, { admin: closetAdmin });
    setLook(shown);
    setWornLook(stored ? shown : null);
    setWaved(readDayFlag(localStorage, GAME_WAVE_KEY, today));
    const claimed = chestClaimedSessions(localStorage, today);
    setClaimedMorning(claimed.morning);
    setClaimedEvening(claimed.evening);
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
  }, [today, closetAdmin]);

  useEffect(() => {
    if (!ready || !mascotQuery.data) return;
    const raw = mascotQuery.data.loadout.accessories.find((item) => isTreeWearClip(item.id))?.id ?? null;
    if (!raw || !isTreeWearClip(raw)) return;
    if (!mascotQuery.data.ownedItems.some((item) => item.id === raw && !item.previewOnly)) return;
    const server = raw;
    setLook((current) => {
      if (current.clip === server) return current;
      const next = { ...current, clip: server };
      if (!saveGameLook(localStorage, next)) return current;
      setWornLook(next);
      return next;
    });
  }, [ready, mascotQuery.data]);

  const morning = routineQuery.data?.morning ?? [];
  const evening = routineQuery.data?.evening ?? [];
  const careSteps = useMemo(() => {
    const am = routineQuery.data?.morning ?? [];
    const pm = routineQuery.data?.evening ?? [];
    return [
      ...am.map((step) => ({ ...step, section: "morning" as const })),
      ...pm.map((step) => ({ ...step, section: "evening" as const })),
    ];
  }, [routineQuery.data]);
  const commitTicks = useCallback(
    async (next: RoutineDTO) => {
      const previous = queryClient.getQueryData<RoutineDTO>(routineTodayQueryKey);
      queryClient.setQueryData(routineTodayQueryKey, next);
      try {
        const saved = await apiPost<RoutineDTO>("/api/v1/routines", routineTickBody(next), { toastOnError: false });
        const stored = saved
          ? { ...saved, morning: keepAffiliate(next.morning, saved.morning), evening: keepAffiliate(next.evening, saved.evening) }
          : next;
        queryClient.setQueryData(routineTodayQueryKey, stored);
        const woke =
          isSessionComplete(stored.morning) ||
          isSessionComplete(stored.evening) ||
          (stored.morning.length + stored.evening.length > 0 &&
            stored.morning.every((step) => step.completed) &&
            stored.evening.every((step) => step.completed));
        if (woke) useBeDaPoseStore.getState().setSessionHappy(true);
        await queryClient.invalidateQueries({ queryKey: routineTodayQueryKey });
        await queryClient.invalidateQueries({ queryKey: mascotQueryKey });
      } catch {
        queryClient.setQueryData(routineTodayQueryKey, previous);
      }
    },
    [queryClient],
  );
  const toggleCareStep = useCallback(
    (step: { id: string; section: "morning" | "evening" }) => {
      if (!sessionOpen(step.section)) return;
      const current = queryClient.getQueryData<RoutineDTO>(routineTodayQueryKey) ?? routineQuery.data;
      if (!current) return;
      const next: RoutineDTO = {
        ...current,
        [step.section]: current[step.section].map((item) =>
          item.id === step.id ? { ...item, completed: !item.completed } : item,
        ),
      };
      void commitTicks(next);
    },
    [commitTicks, queryClient, routineQuery.data],
  );
  const finishCareSteps = useCallback(() => {
    const current = queryClient.getQueryData<RoutineDTO>(routineTodayQueryKey) ?? routineQuery.data;
    if (!current) return;
    const done = (steps: RoutineStepDTO[]) => steps.map((item) => ({ ...item, completed: true }));
    const morningOpen = sessionOpen("morning");
    const eveningOpen = sessionOpen("evening");
    void commitTicks({
      ...current,
      morning: morningOpen ? done(current.morning) : current.morning,
      evening: eveningOpen ? done(current.evening) : current.evening,
    });
  }, [commitTicks, queryClient, routineQuery.data]);
  const routineToday = mascotQuery.data?.routineToday ?? null;
  const quests = gameQuests({ morning, routineToday, wavedToday: waved });
  const day = routineSummary(careSteps);
  const morningDone = sessionComplete(morning);
  const eveningDone = sessionComplete(evening);
  const pendingChest = pendingChestSession({
    morningDone,
    eveningDone,
    morningClaimed: claimedMorning,
    eveningClaimed: claimedEvening,
  });
  const canChest = pendingChest != null;

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
    if (!ready || !pendingChest || roomCode) return;
    if (autoChest.current === pendingChest) return;
    autoChest.current = pendingChest;
    setChestDismissed(false);
    setTab("quests");
  }, [ready, pendingChest, roomCode]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(id);
  }, [toast]);

  const presence = useLobbyPresence({
    active: tab === "lobby" && !inSpa,
    look: presented,
    gender: view.gender,
    onRemoteEmote: (event) => {
      setToast(event);
      setBurst((n) => n + 1);
      playGameTing(soundRef.current);
    },
  });
  const treeListen = useRef<(event: RoomEvent & { tree: NonNullable<RoomEvent["tree"]> }) => void>(() => undefined);
  const spaRoom = useSpaRoom({
    active: code != null,
    code,
    look: presented,
    gender: view.gender,
    onTreeEvent: (event) => treeListen.current(event),
    onRemoteEmote: (event) => {
      if (event.kind === "nudge") {
        setToast({
          kind: "nudge",
          message: event.message,
          variant: event.variant,
          type: event.type,
          nudgeType: event.nudgeType,
        });
      }
      else setToast(event);
      setBurst((n) => n + 1);
      playGameTing(soundRef.current);
    },
  });
  const together = useRoomShared(code, code != null && spaRoom.entry === "room", user?.id ?? null);
  const tree = useRoomTree(
    code,
    code != null && spaRoom.entry === "room" && mascotFeatureEnabled(user),
    "",
    together.applyBalance,
    treeListen,
  );

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
      setChestDismissed(true);
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

  useEffect(() => {
    if (tab !== "lobby" || inSpa) return;
    let cancel = false;
    const remembered = readRememberedSpaRooms(localStorage);
    setMyRooms(remembered);
    void listMySpaRooms()
      .then((rooms) => {
        if (cancel) return;
        setRoomLock(pickActiveRoom(rooms));
        const open = rooms.filter((room) => !room.endsAt || Date.parse(room.endsAt) > Date.now());
        setMyRooms(
          rooms.length === 0
            ? readRememberedSpaRooms(localStorage)
            : mergeSpaRoomCodes(localStorage, open.map((room) => room.code)),
        );
      })
      .catch(() => {
        if (!cancel) setMyRooms(readRememberedSpaRooms(localStorage));
      });
    return () => {
      cancel = true;
    };
  }, [tab, inSpa]);

  function leaveSpa(next: GameTab) {
    try {
      sessionStorage.setItem(SPA_TAB_KEY, next);
    } catch {
      /* the route change still leaves the room */
    }
    router.push("/be-da");
  }

  async function createRoom(treeType?: string) {
    if (creatingRoom) return;
    setCreatingRoom(true);
    setCreateProblem(null);
    try {
      const created = await createSpaRoom(treeType);
      const next = normalizeRoomCode(created.code);
      if (!next) {
        setCreateProblem("offline");
        return;
      }
      rememberSpaRoom(localStorage, next);
      setMyRooms(readRememberedSpaRooms(localStorage));
      router.push(roomInvitePath(next));
    } catch (err) {
      const problem = spaProblemFromError(err);
      const lock = roomLockFromError(err);
      setCreateProblem(problem);
      if (lock) setRoomLock(lock);
      if (problem === "too-many" || problem === "already-in") {
        try {
          const rooms = await listMySpaRooms();
          if (!lock) setRoomLock(pickActiveRoom(rooms));
          setMyRooms(mergeSpaRoomCodes(localStorage, rooms.map((room) => room.code)));
        } catch {
          setMyRooms(readRememberedSpaRooms(localStorage));
        }
      } else {
        setMyRooms(readRememberedSpaRooms(localStorage));
      }
    } finally {
      setCreatingRoom(false);
    }
  }

  function onFriendAction(kind: "wave" | "heart" | "outfit" | "cheer" | "poke") {
    if (inSpa) {
      const guest = spaRoom.guests.find((item) => item.id === selectedFriendId);
      if (!guest) return;
      feedback();
      setToast({ name: guest.nickname, kind });
      spaRoom.emote(guest, kind);
      return;
    }
    const friend = presence.actors.find((item) => item.id === selectedFriendId);
    if (!friend || kind === "cheer" || kind === "poke") return;
    feedback();
    setToast({ name: friend.nickname, kind });
    presence.emote(friend, kind);
    if (kind !== "wave") return;
    if (waved) return;
    writeDayFlag(localStorage, GAME_WAVE_KEY, today);
    setWaved(true);
  }

  function onClaim() {
    feedback();
    if (pendingChest === "morning") {
      writeDayFlag(localStorage, GAME_CHEST_MORNING_KEY, today);
      setClaimedMorning(true);
    } else if (pendingChest === "evening") {
      writeDayFlag(localStorage, GAME_CHEST_EVENING_KEY, today);
      setClaimedEvening(true);
    }
    setChestDismissed(true);
    setTab("care");
  }

  const checkedIn =
    checkedInOnDay(mascotQuery.data?.lastCheckinAt, today) ||
    checkedInOnDay(streak.data?.last_check_in_date, today);
  const wallet = walletXu(shopQuery.data?.balance);
  const coinsLabel = shopQuery.isSuccess && wallet != null ? formatGameCoins(wallet, locale) : "…";
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
    <>
    <BeDaGameView
      locale={locale}
      tab={tab}
      sky={skyPeriod(new Date())}
      coinsLabel={coinsLabel}
      streakLabel={streakLabel}
      soundOn={soundOn}
      quests={quests}
      careSteps={careSteps}
      onToggleCareStep={toggleCareStep}
      onFinishCareSteps={finishCareSteps}
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
      look={presented}
      wornIds={wornIds}
      hearts={
        pendingChest === "morning"
          ? day.morning.done
          : pendingChest === "evening"
            ? day.evening.done
            : day.morning.done + day.evening.done
      }
      wavedToday={waved}
      streakKept={(streak.data?.current_streak ?? 0) > 0 || checkedIn}
      giftTaken={!pendingChest && (claimedMorning || claimedEvening)}
      player={view}
      burst={burst}
      homeHref={localePath(locale, "/check-in")}
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
              onlineCount: code ? spaRoom.onlineCount : null,
              cap: spaRoom.cap,
              guests: code ? spaRoom.guests : [],
              notice: code ? spaRoom.notice : "bad-code",
              you: code ? spaRoom.you : null,
              landscape: code ? spaRoom.landscape : false,
              youStreak: code ? spaRoom.youStreak : 0,
              youNickname: code ? spaRoom.youNickname : "",
              name: code ? spaRoom.roomName : "",
              daysLeft: code && spaRoom.endsAt ? remainingRoomDays(new Date(spaRoom.endsAt), new Date()) : null,
              lock: code ? spaRoom.conflict : null,
              entry: code ? spaRoom.entry : "room",
            }
          : null
      }
      youPose={spaRoom.youPose}
      together={inSpa ? together : null}
      tree={inSpa ? tree : null}
      onCreateRoom={() => void createRoom()}
      creatingRoom={creatingRoom}
      createProblem={createProblem}
      myRooms={myRooms}
      activeRoom={inSpa ? null : roomLock}
      onJoinRoom={(next) => {
        rememberSpaRoom(localStorage, next);
        router.push(roomInvitePath(next));
      }}
      onSpaRetry={() => spaRoom.retry()}
      onSpaQuit={() => {
        void spaRoom.leaveMembership().finally(() => leaveSpa("care"));
      }}
      onPlantSeed={async (treeType) => {
        const created = await createSpaRoom(treeType);
        const next = normalizeRoomCode(created.code);
        if (!next) throw new Error("bad-room");
        rememberSpaRoom(localStorage, next);
        setMyRooms(readRememberedSpaRooms(localStorage));
        router.push(roomInvitePath(next));
      }}
      onLeaveSpa={() => leaveSpa("care")}
      onSpaLobby={() => leaveSpa("lobby")}
      onSpaWalk={spaRoom.walkTo}
      onSpaBoard={spaRoom.loadBoard}
      onSelectFriend={setSelectedFriendId}
      onFriendAction={onFriendAction}
      onClaim={onClaim}
      wornLook={wornLook}
      closetAdmin={closetAdmin}
      ownedClipIds={ownedClipIds}
      introResetAdmin={closetAdmin}
      onIntroReset={() => router.push(introResetHref())}
      loiText={loiText}
      shopCloset={shopCloset}
      onOpenShop={() => setShopOpen(true)}
      shopSlot={
        shopOpen ? (
          <XuShopScreen
            locale={locale}
            gender={mascotQuery.data?.gender ?? null}
            player={view}
            onClose={() => setShopOpen(false)}
          />
        ) : null
      }
      onWearShop={(item) => {
        void wearShopPiece(queryClient, item.id, item.layer, mascotQuery.data?.gender).catch(() => {
          setToast({ kind: "wear-failed", name: "" });
        });
      }}
      onLook={(next) => {
        const saved = equippedGameLook(next, {
          admin: closetAdmin,
          ownedIds: new Set(ownedClipIds),
        });
        if (!saveGameLook(localStorage, saved)) {
          setToast({ kind: "wear-failed", name: "" });
          return false;
        }
        const clip = saved.clip && isTreeWearClip(saved.clip) ? saved.clip : null;
        const hadTree = mascotQuery.data?.loadout.accessories.some((item) => isTreeWearClip(item.id)) ?? false;
        if (clip || hadTree) {
          void wearMascotClip(queryClient, clip).catch(() => {
            setToast({ kind: "wear-failed", name: "" });
          });
        }
        feedback();
        setLook(saved);
        setWornLook(saved);
        setToast({ kind: "worn", name: saved.outfit });
        pushLoiEvent("mac_do_moi");
        return true;
      }}
    />
    </>
  );
}
