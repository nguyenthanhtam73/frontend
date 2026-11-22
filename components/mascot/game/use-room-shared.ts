"use client";

import { useCallback, useEffect, useState } from "react";

import {
  canNudgeMember,
  chestsFromQuest,
  claimRoomChest,
  friendlyRoomMessage,
  getRoomQuest,
  getRoomToday,
  isQuestGrace,
  isQuestHidden,
  nudgeRoomMember,
  readNudgedIds,
  rememberNudgedId,
  sharedRoomError,
  type RoomChest,
  type RoomQuest,
  type RoomTodayMember,
} from "@/lib/mascot/game/room-shared";

export type RoomTogether = {
  visible: boolean;
  loading: boolean;
  quest: RoomQuest | null;
  grace: boolean;
  expired: boolean;
  message: string | null;
  chests: RoomChest[];
  coins: number | null;
  gain: number | null;
  popDays: number | null;
  claiming: number | null;
  today: RoomTodayMember[];
  todayMessage: string | null;
  selfId: string | null;
  nudged: readonly string[];
  nudging: string | null;
  onClaim: (memberDays: number) => void;
  onNudge: (userId: string) => void;
};

const IDLE: RoomChest[] = [];

function browserStorage(): Pick<Storage, "getItem" | "setItem"> | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Quest, Hôm nay, and Nhắc bạn for the open room.
 * A 404 not_found hides the panels. room_ended on GET /quest stays on screen
 * so a chest can still be claimed during the few days after the room ends.
 */
export function useRoomShared(code: string | null, active: boolean, selfId: string | null): RoomTogether {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quest, setQuest] = useState<RoomQuest | null>(null);
  const [grace, setGrace] = useState(false);
  const [expired, setExpired] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [chests, setChests] = useState<RoomChest[]>(IDLE);
  const [coins, setCoins] = useState<number | null>(null);
  const [gain, setGain] = useState<number | null>(null);
  const [popDays, setPopDays] = useState<number | null>(null);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [today, setToday] = useState<RoomTodayMember[]>([]);
  const [todayMessage, setTodayMessage] = useState<string | null>(null);
  const [vnDate, setVnDate] = useState("");
  const [nudged, setNudged] = useState<string[]>([]);
  const [nudging, setNudging] = useState<string | null>(null);

  useEffect(() => {
    if (!active || !code) {
      setVisible(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setVisible(true);
    setLoading(true);
    setQuest(null);
    setGrace(false);
    setExpired(false);
    setMessage(null);
    setChests(IDLE);
    setGain(null);
    setPopDays(null);
    setToday([]);
    setTodayMessage(null);
    setVnDate("");
    setNudged([]);

    void (async () => {
      const [questResult, todayResult] = await Promise.allSettled([getRoomQuest(code), getRoomToday(code)]);
      if (cancelled) return;
      if (questResult.status === "fulfilled") {
        setGrace(false);
        setQuest(questResult.value);
        setChests(chestsFromQuest(questResult.value));
      } else if (isQuestHidden(questResult.reason)) {
        setVisible(false);
      } else if (isQuestGrace(questResult.reason)) {
        const problem = sharedRoomError(questResult.reason);
        setGrace(false);
        setExpired(true);
        setQuest(null);
        setMessage(friendlyRoomMessage(problem?.code ?? "room_ended", problem?.message ?? ""));
        setChests(chestsFromQuest(null, { expired: true }));
      } else {
        const problem = sharedRoomError(questResult.reason);
        setMessage(friendlyRoomMessage(problem?.code ?? "", problem?.message ?? ""));
        setChests(chestsFromQuest(null));
      }
      if (todayResult.status === "fulfilled") {
        setToday(todayResult.value.members);
        setVnDate(todayResult.value.vnDate);
        setTodayMessage(null);
        const storage = browserStorage();
        if (storage) setNudged(readNudgedIds(storage, code, todayResult.value.vnDate));
      } else if (isQuestGrace(todayResult.reason)) {
        setToday([]);
        setTodayMessage(friendlyRoomMessage("room_ended", sharedRoomError(todayResult.reason)?.message ?? ""));
      } else {
        const problem = sharedRoomError(todayResult.reason);
        setTodayMessage(friendlyRoomMessage(problem?.code ?? "", problem?.message ?? ""));
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [active, code]);

  const onClaim = useCallback(
    (memberDays: number) => {
      if (!code || claiming != null || expired) return;
      const chest = chests.find((item) => item.memberDays === memberDays);
      if (!chest || chest.state === "claimed" || chest.state === "locked" || chest.state === "expired") return;
      setClaiming(memberDays);
      setMessage(null);
      void claimRoomChest(code, memberDays)
        .then((result) => {
          setCoins(result.balance);
          setGain(result.alreadyClaimed ? 0 : result.coins);
          setPopDays(result.memberDays);
          setExpired(false);
          setChests((prev) =>
            (prev.length > 0 ? prev : chestsFromQuest(null, { grace: true })).map((item) =>
              item.memberDays === result.memberDays ? { ...item, state: "claimed" } : item,
            ),
          );
          setQuest((prev) =>
            prev
              ? {
                  ...prev,
                  progress: result.progress,
                  milestones: prev.milestones.map((item) =>
                    item.memberDays === result.memberDays
                      ? { ...item, claimed: true, claimable: false, reached: true }
                      : item,
                  ),
                }
              : prev,
          );
          if (result.alreadyClaimed) setMessage("Bạn đã nhận rương này rồi.");
        })
        .catch((err: unknown) => {
          const problem = sharedRoomError(err);
          const codeName = problem?.code ?? "";
          const line =
            codeName === "chest_closed" ? "Cần 1 ngày của bạn" : friendlyRoomMessage(codeName, problem?.message ?? "");
          setMessage(line);
          if (codeName === "chests_expired") {
            setExpired(true);
            setGrace(false);
            setChests((prev) => chestsFromQuest(null, { expired: true }).map((item) => {
              const had = prev.find((row) => row.memberDays === item.memberDays);
              return had?.state === "claimed" ? had : item;
            }));
          } else if (codeName === "chest_closed") {
            setChests((prev) =>
              prev.map((item) => (item.memberDays === memberDays ? { ...item, state: "closed" } : item)),
            );
          }
        })
        .finally(() => setClaiming(null));
    },
    [chests, claiming, code, expired],
  );

  const onNudge = useCallback(
    (userId: string) => {
      if (!code || nudging) return;
      const member = today.find((item) => item.userId === userId.toLowerCase());
      if (!member || !canNudgeMember(member, selfId) || nudged.includes(member.userId)) return;
      setNudging(member.userId);
      setTodayMessage(null);
      void nudgeRoomMember(code, member.userId)
        .then((result) => {
          const date = result.vnDate || vnDate;
          if (date) setVnDate(date);
          const storage = browserStorage();
          const next = storage && date ? rememberNudgedId(storage, code, date, result.userId) : [...nudged, result.userId];
          setNudged(next);
          if (result.message) setTodayMessage(result.message);
        })
        .catch((err: unknown) => {
          const problem = sharedRoomError(err);
          const line = friendlyRoomMessage(problem?.code ?? "", problem?.message ?? "");
          setTodayMessage(line);
          if (problem?.code === "already_nudged") {
            const date = vnDate;
            const storage = browserStorage();
            const next = storage && date ? rememberNudgedId(storage, code, date, member.userId) : [...nudged, member.userId];
            setNudged(next);
          }
          if (problem?.code === "already_done") {
            setToday((prev) =>
              prev.map((item) => (item.userId === member.userId ? { ...item, caredToday: true } : item)),
            );
          }
        })
        .finally(() => setNudging(null));
    },
    [code, nudged, nudging, selfId, today, vnDate],
  );

  return {
    visible: active && !!code && visible,
    loading,
    quest,
    grace,
    expired,
    message,
    chests,
    coins,
    gain,
    popDays,
    claiming,
    today,
    todayMessage,
    selfId,
    nudged,
    nudging,
    onClaim,
    onNudge,
  };
}
