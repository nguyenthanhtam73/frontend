"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { apiBaseUrl } from "@/lib/api";
import { ensureFreshAccessToken, getAccessToken } from "@/lib/auth-token";
import type { GameLook, GamePose } from "@/lib/mascot/game/look";
import {
  clearLobbyAccessCookie,
  defaultLobbyNickname,
  loadLobbyNickname,
  lobbyAccessCookie,
  lobbyCookieMaxAge,
  lobbyCookiePlan,
  isSessionId,
  lobbyPose,
  lobbySocketUrl,
  type LobbyCookiePlan,
  type LobbyFacing,
} from "@/lib/mascot/game/lobby-live";
import type { LobbySocketLike } from "@/lib/mascot/game/lobby-socket";
import {
  getSpaBoard,
  getSpaRoom,
  isAlreadyInRoomError,
  joinSpaRoom,
  leaveSpaRoom,
  roomLockFromError,
  spaProblemFromError,
} from "@/lib/mascot/game/spa-room-api";
import { RoomConnection } from "@/lib/mascot/game/spa-room-socket";
import {
  SPA_HIDE_KEY,
  SPA_ROOM_CAP,
  applyRoomMessage,
  emptyRoom,
  encodeRoomFrame,
  rankCareStreaks,
  SPA_ENTRY_TIMEOUT_MS,
  spaEntryPhase,
  spaMembershipEnds,
  spaRoomGuests,
  spreadSpaFeet,
  shouldRetryRoomJoin,
  spaHeadCount,
  spaMembershipChanged,
  spaRoomProblem,
  type RoomClientFrame,
  type RoomClock,
  type RoomServerMessage,
  type RoomSnapshot,
  type SpaGuest,
  type SpaNotice,
} from "@/lib/mascot/game/spa-room";

export type SpaEmoteKind = "wave" | "heart" | "outfit" | "cheer" | "poke";

export type SpaRemote =
  | { name: string; kind: SpaEmoteKind }
  | { kind: "nudge"; message: string };

/**
 * REST join first, then one socket `join` on channel "room".
 * Sample friends stay only when the room channel says `not_available`
 * or the socket never opens before we know the room. The token is never
 * put on the URL.
 */
export function useSpaRoom(options: {
  active: boolean;
  code: string | null;
  look: GameLook;
  gender?: "female" | "male";
  onRemoteEmote?: (toast: SpaRemote) => void;
}) {
  const { active, code, look, gender, onRemoteEmote } = options;
  const [live, setLive] = useState(false);
  const [notice, setNotice] = useState<SpaNotice>(null);
  const [room, setRoom] = useState<RoomSnapshot>(() => emptyRoom(code ?? ""));
  const [serverCode, setServerCode] = useState<string | null>(null);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [members, setMembers] = useState<number | null>(null);
  const [presence, setPresence] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [entered, setEntered] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const enteredRef = useRef(false);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [poses, setPoses] = useState<Record<string, GamePose | null>>({});
  const [youPose, setYouPose] = useState<GamePose | null>(null);
  const [nickname] = useState(readDeviceNickname);
  const [conflict, setConflict] = useState<RoomClock | null>(null);
  const [roomName, setRoomName] = useState("");
  const [endsAt, setEndsAt] = useState<string | null>(null);

  const lookRef = useRef(look);
  const nickRef = useRef(nickname);
  const hiddenRef = useRef(hidden);
  const roomRef = useRef(room);
  const liveRef = useRef(live);
  const remoteRef = useRef(onRemoteEmote);
  const connRef = useRef<RoomConnection | null>(null);
  const joinedRef = useRef(false);
  const retriedRef = useRef(false);
  const timers = useRef<number[]>([]);
  const genderRef = useRef(gender);
  genderRef.current = gender;
  lookRef.current = look;
  nickRef.current = nickname;
  hiddenRef.current = hidden;
  roomRef.current = room;
  liveRef.current = live;
  remoteRef.current = onRemoteEmote;

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SPA_HIDE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const next = new Set(parsed.filter((id): id is string => typeof id === "string"));
      hiddenRef.current = next;
      setHidden(next);
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => () => {
    for (const id of timers.current) window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!active || !code) {
      connRef.current?.stop();
      connRef.current = null;
      setLive(false);
      return;
    }

    let cancelled = false;
    joinedRef.current = false;
    retriedRef.current = false;
    setLive(false);
    setNotice(null);
    setServerCode(null);
    setPreviewCount(null);
    setMembers(null);
    setPresence(null);
    setConflict(null);
    setRoomName("");
    setEndsAt(null);
    setRoom(emptyRoom(code));
    setTimedOut(false);
    enteredRef.current = false;
    setEntered(false);
    const entryTimer = window.setTimeout(() => {
      if (!cancelled && !enteredRef.current) setTimedOut(true);
    }, SPA_ENTRY_TIMEOUT_MS);
    let memberTimer = 0;
    const refreshMembers = () => {
      window.clearTimeout(memberTimer);
      memberTimer = window.setTimeout(() => {
        void getSpaRoom(code)
          .then((next) => {
            if (cancelled) return;
            setMembers(next.memberCount);
            setPreviewCount(next.memberCount);
          })
          .catch(() => undefined);
      }, 200);
    };
    const markEntered = () => {
      if (cancelled || enteredRef.current) return;
      enteredRef.current = true;
      setEntered(true);
      window.clearTimeout(entryTimer);
    };

    const joinFrame = (): RoomClientFrame => {
      const worn = lookRef.current;
      return {
        op: "join",
        code,
        nickname: nickRef.current,
        outfit: worn.outfit,
        hair: worn.hair,
        accessory: worn.clip ?? "",
        ...(genderRef.current === "male" ? { gender: "male" as const } : {}),
        facing: "right",
        action: "idle",
      };
    };

    const stopSocket = () => {
      connRef.current?.fail();
    };

    const handle = (message: RoomServerMessage) => {
      if (message.op === "error") {
        if (message.code === "not_available") {
          setNotice(null);
          setLive(false);
          return;
        }
        if (shouldRetryRoomJoin(message.code, retriedRef.current)) {
          retriedRef.current = true;
          // The hub allows 2 client frames per second. A second join in that
          // same second is what comes back as rate_limited.
          const retryTimer = window.setTimeout(() => {
            if (cancelled) return;
            void joinSpaRoom(code)
              .then((room) => {
                if (cancelled) return;
                joinedRef.current = true;
                setPreviewCount(room.memberCount);
                setMembers(room.memberCount);
                connRef.current?.send(encodeRoomFrame(joinFrame()), "join");
              })
              .catch((err: unknown) => {
                if (cancelled || enteredRef.current) return;
                setNotice(spaProblemFromError(err));
                setLive(false);
                stopSocket();
              });
          }, 1100);
          timers.current.push(retryTimer);
          return;
        }
        const problem = spaRoomProblem(null, message.code);
        if (problem === "rate") {
          // A dropped move or gesture is not a failed entry. The room stays up.
          if (!enteredRef.current && !liveRef.current) setNotice("rate");
          return;
        }
        if (problem) {
          setNotice(problem);
          setLive(false);
          stopSocket();
          return;
        }
        setNotice("offline");
        setLive(false);
        stopSocket();
        return;
      }
      if (message.op === "hello") {
        setNotice(null);
        markEntered();
        setLive(true);
        const nextCode = message.code || code;
        setServerCode(nextCode);
        setPreviewCount(message.count);
        setPresence(message.count);
        setRoom((prev) => applyRoomMessage(prev, message));
        return;
      }
      if (message.op === "tick") {
        const previousIds = new Set(roomRef.current.people.map((person) => person.id));
        if (spaMembershipChanged(message, previousIds)) refreshMembers();
        const known = [...roomRef.current.people, ...message.upserts];
        for (const event of message.events) {
          if (event.op === "nudge") {
            if (event.target && event.target === roomRef.current.sessionId && event.message) {
              remoteRef.current?.({ kind: "nudge", message: event.message });
            }
            continue;
          }
          if (
            event.op !== "wave" &&
            event.op !== "heart" &&
            event.op !== "compliment" &&
            event.op !== "cheer" &&
            event.op !== "poke"
          ) {
            continue;
          }
          if (!event.from || event.from === roomRef.current.sessionId) continue;
          const person = known.find((item) => item.id === event.from);
          if (!person || hiddenRef.current.has(person.id)) continue;
          showPose(event.from, lobbyPose(event.op) ?? "wave");
          remoteRef.current?.({
            name: person.nickname,
            kind: event.op === "compliment" ? "outfit" : event.op,
          });
        }
        setRoom((prev) => applyRoomMessage(prev, message));
        setPresence(message.count);
        if (message.count > 0) setPreviewCount(message.count);
        return;
      }
      if (message.op === "bye" || message.op === "replaced") {
        setLive(false);
        setRoom((prev) => applyRoomMessage(prev, message));
      }
    };

    const openSocket = (plan: NonNullable<ReturnType<typeof readCookiePlan>>) => {
      void (async () => {
        const token = (await ensureFreshAccessToken(apiBaseUrl)) ?? getAccessToken();
        if (cancelled || !token || !plan.ok) return;
        document.cookie = lobbyAccessCookie(token, plan, lobbyCookieMaxAge(token, Date.now()));
        const connection = new RoomConnection({
          url: lobbySocketUrl(apiBaseUrl),
          now: () => Date.now(),
          connect: (url) => new WebSocket(url) as unknown as LobbySocketLike,
          setTimer: (fn, ms) => window.setTimeout(fn, ms),
          clearTimer: (id) => window.clearTimeout(id),
          onMessage: (message) => {
            if (!cancelled) handle(message);
          },
          onStatus: (status) => {
            if (cancelled) return;
            if (status === "live") {
              markEntered();
              setLive(true);
              return;
            }
            setLive(false);
            if (enteredRef.current) setNotice("offline");
          },
        });
        if (cancelled) return;
        connRef.current = connection;
        connection.start(() => encodeRoomFrame(joinFrame()));
      })();
    };

    void (async () => {
      try {
        const preview = await getSpaRoom(code);
        if (cancelled) return;
        setPreviewCount(preview.memberCount);
        setMembers(preview.memberCount);
        setRoomName(preview.name);
        setEndsAt(preview.endsAt);
        setRoom((prev) => ({ ...prev, code: preview.code, cap: preview.cap, count: preview.memberCount }));
        if (preview.memberCount >= preview.cap && !preview.joined) {
          setNotice("full");
          return;
        }
      } catch (err) {
        const problem = spaProblemFromError(err);
        if (
          problem === "missing" ||
          problem === "bad-code" ||
          problem === "full" ||
          problem === "ended" ||
          problem === "rate"
        ) {
          if (!cancelled) setNotice(problem);
          return;
        }
      }
      try {
        const joined = await joinSpaRoom(code);
        if (cancelled) return;
        joinedRef.current = true;
        setPreviewCount(joined.memberCount);
        setMembers(joined.memberCount);
        setRoomName(joined.name);
        setEndsAt(joined.endsAt);
        setRoom((prev) => ({ ...prev, code: joined.code, cap: joined.cap, count: joined.memberCount }));
      } catch (err) {
        if (!cancelled) {
          const lock = roomLockFromError(err);
          if (isAlreadyInRoomError(err) && lock && lock.code !== code) {
            setConflict(lock);
            setNotice("already-in");
            return;
          }
          if (isAlreadyInRoomError(err)) {
            joinedRef.current = true;
          } else {
            setNotice(spaProblemFromError(err));
            return;
          }
        } else return;
      }
      const plan = readCookiePlan();
      if (!plan?.ok || cancelled) return;
      openSocket(plan);
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(entryTimer);
      window.clearTimeout(memberTimer);
      const joined = joinedRef.current;
      joinedRef.current = false;
      connRef.current?.stop();
      connRef.current = null;
      // Closing the screen or retrying only drops the socket. Membership stays.
      if (joined && spaMembershipEnds("unmount")) void leaveSpaRoom(code).catch(() => undefined);
      const plan = readCookiePlan();
      if (plan?.ok) document.cookie = clearLobbyAccessCookie(plan);
      setLive(false);
    };
  }, [active, code, attempt]);

  function showPose(id: string, pose: GamePose) {
    setPoses((prev) => ({ ...prev, [id]: pose }));
    const timer = window.setTimeout(() => {
      setPoses((prev) => ({ ...prev, [id]: null }));
    }, 1400);
    timers.current.push(timer);
  }

  const guests = useMemo(
    () =>
      spaRoomGuests({
        code,
        live: live && notice !== "full",
        notice,
        previewCount,
        people: room.people,
        selfId: notice === "full" ? null : room.sessionId,
        hidden,
        poses,
      }),
    [code, notice, live, previewCount, room.people, room.sessionId, hidden, poses],
  );

  const you = useMemo(() => {
    const self = room.people.find((person) => person.id === room.sessionId);
    if (!self?.placed) return null;
    const spots = spreadSpaFeet(
      room.people.filter((person) => person.placed !== false).map((person) => ({ id: person.id, x: person.x, y: person.y })),
    );
    return spots.get(self.id) ?? { x: self.x, y: self.y };
  }, [room.people, room.sessionId]);
  const youStreak = useMemo(() => {
    const self = room.people.find((person) => person.id === room.sessionId);
    return self?.careStreak ?? 0;
  }, [room.people, room.sessionId]);
  const sent = useRef<{ x: number; y: number; facing: LobbyFacing }>({ x: you?.x ?? 0.5, y: you?.y ?? 0.7, facing: "right" });

  const count = spaHeadCount({
    live: live && notice !== "full",
    notice,
    serverCount: room.count,
    visibleGuests: guests.length,
    previewCount,
    memberCount: members,
  });
  const onlineCount = members != null && live ? presence : null;

  async function loadBoard() {
    const roomCode = serverCode ?? code ?? "";
    if (roomCode) {
      try {
        return await getSpaBoard(roomCode);
      } catch {
        /* The board route is optional until the backend ships. */
      }
    }
    const rows = roomRef.current.people.map((person) => ({
      nickname: person.nickname,
      careStreak: person.careStreak ?? 0,
    }));
    if (rows.length === 0) {
      return rankCareStreaks(guests.map((guest) => ({ nickname: guest.nickname, careStreak: guest.careStreak ?? 0 })));
    }
    return rankCareStreaks(rows);
  }

  function walkTo(x: number, y: number, pace: "walk" | "idle" = "walk") {
    if (!liveRef.current) return;
    const prev = sent.current;
    const facing: LobbyFacing = x < prev.x - 0.004 ? "left" : x > prev.x + 0.004 ? "right" : prev.facing;
    sent.current = { x, y, facing };
    connRef.current?.send(
      encodeRoomFrame({
        op: "move-to",
        x,
        y,
        facing,
        action: pace === "idle" ? "idle" : "walk",
      }),
      "move-to",
    );
  }

  function emote(guest: Pick<SpaGuest, "id" | "sample">, kind: SpaEmoteKind) {
    const pose: GamePose = kind === "wave" ? "wave" : kind === "poke" ? "poke" : "cheer";
    showPose(guest.id, pose);
    setYouPose(pose);
    const timer = window.setTimeout(() => setYouPose(null), 1600);
    timers.current.push(timer);
    if (guest.sample || !liveRef.current || !isSessionId(guest.id)) return;
    if (kind === "outfit") connRef.current?.send(encodeRoomFrame({ op: "compliment", target: guest.id }), "compliment");
    else connRef.current?.send(encodeRoomFrame({ op: kind, target: guest.id }), kind);
  }

  function hide(id: string) {
    const next = new Set(hiddenRef.current);
    next.add(id);
    hiddenRef.current = next;
    setHidden(next);
    try {
      sessionStorage.setItem(SPA_HIDE_KEY, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
    if (!liveRef.current) return;
    connRef.current?.send(
      encodeRoomFrame({ op: "hide", hide: [...next].filter((item) => isSessionId(item)) }),
      "hide",
    );
  }

  return {
    live,
    notice,
    guests,
    count,
    onlineCount,
    cap: room.cap || SPA_ROOM_CAP,
    code: serverCode ?? code ?? "",
    serverCode,
    youPose,
    you,
    youStreak,
    conflict,
    roomName,
    endsAt,
    loadBoard,
    emote,
    hide,
    walkTo,
    entry: code ? spaEntryPhase({ live, entered, timedOut, notice }) : "room",
    retry: () => setAttempt((n) => n + 1),
    leaveMembership: async () => {
      const current = serverCode ?? code;
      if (!current || !spaMembershipEnds("explicit")) return;
      await leaveSpaRoom(current).catch(() => undefined);
    },
  };
}

function readDeviceNickname(): string {
  if (typeof window === "undefined") return defaultLobbyNickname(() => 0.48211);
  try {
    return loadLobbyNickname(localStorage);
  } catch {
    return defaultLobbyNickname(() => 0.48211);
  }
}

function readCookiePlan(): LobbyCookiePlan | null {
  if (typeof window === "undefined") return null;
  try {
    const apiHost = new URL(apiBaseUrl.includes("://") ? apiBaseUrl : `http://${apiBaseUrl}`).hostname;
    return lobbyCookiePlan(window.location.hostname, window.location.protocol, apiHost);
  } catch {
    return null;
  }
}
