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
} from "@/lib/mascot/game/lobby-live";
import type { LobbySocketLike } from "@/lib/mascot/game/lobby-socket";
import { RoomConnection } from "@/lib/mascot/game/spa-room-socket";
import {
  SPA_CREATE_KEY,
  SPA_HIDE_KEY,
  SPA_ROOM_CAP,
  applyRoomMessage,
  emptyRoom,
  encodeRoomFrame,
  isRoomFull,
  isRoomMissing,
  sampleSpaGuests,
  seatGuests,
  spaHeadCount,
  type RoomClientFrame,
  type RoomServerMessage,
  type RoomSnapshot,
  type SpaGuest,
  type SpaNotice,
} from "@/lib/mascot/game/spa-room";

export type SpaEmoteKind = "wave" | "heart" | "outfit";

/**
 * Sample spa until channel "room" answers. `not_available`, a missing cookie,
 * or a socket that never opens keeps the sample friends. The token is never
 * put on the URL.
 */
export function useSpaRoom(options: {
  active: boolean;
  code: string | null;
  look: GameLook;
  onRemoteEmote?: (toast: { name: string; kind: SpaEmoteKind }) => void;
}) {
  const { active, code, look, onRemoteEmote } = options;
  const [live, setLive] = useState(false);
  const [notice, setNotice] = useState<SpaNotice>(null);
  const [room, setRoom] = useState<RoomSnapshot>(() => emptyRoom(code ?? ""));
  const [serverCode, setServerCode] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [poses, setPoses] = useState<Record<string, GamePose | null>>({});
  const [youPose, setYouPose] = useState<GamePose | null>(null);
  const [nickname] = useState(readDeviceNickname);

  const lookRef = useRef(look);
  const nickRef = useRef(nickname);
  const hiddenRef = useRef(hidden);
  const roomRef = useRef(room);
  const liveRef = useRef(live);
  const remoteRef = useRef(onRemoteEmote);
  const connRef = useRef<RoomConnection | null>(null);
  const phaseRef = useRef<"create" | "get" | "join" | "in">("get");
  const timers = useRef<number[]>([]);
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
    const plan = readCookiePlan();
    if (!plan?.ok) return;

    let cancelled = false;
    setLive(false);
    setNotice(null);
    setServerCode(null);
    setRoom(emptyRoom(code));

    const memberFrame = (op: "create" | "join"): RoomClientFrame => {
      const worn = lookRef.current;
      return {
        op,
        code,
        nickname: nickRef.current,
        outfit: worn.outfit,
        hair: worn.hair,
        accessory: worn.clip ?? "",
        facing: "right",
        action: "idle",
      };
    };

    const handle = (message: RoomServerMessage) => {
      if (message.op === "error") {
        if (message.code === "not_available" || message.code === "bad_message") {
          if (message.code === "bad_message" && phaseRef.current === "get") {
            phaseRef.current = "join";
            connRef.current?.send(encodeRoomFrame(memberFrame("join")), "join");
            return;
          }
          setNotice(null);
          setLive(false);
          return;
        }
        if (isRoomFull(message.code)) {
          setNotice("full");
          setLive(false);
          return;
        }
        if (isRoomMissing(message.code)) {
          setNotice("missing");
          setLive(false);
          return;
        }
        if (message.code === "nickname_rejected") {
          setNotice("name");
          setLive(false);
        }
        return;
      }
      if (message.op === "room") {
        setRoom((prev) => applyRoomMessage(prev, message));
        const cap = message.cap || SPA_ROOM_CAP;
        if (message.count >= cap) {
          setNotice("full");
          setLive(true);
          return;
        }
        phaseRef.current = "join";
        connRef.current?.send(encodeRoomFrame(memberFrame("join")), "join");
        return;
      }
      if (message.op === "hello") {
        phaseRef.current = "in";
        setNotice(null);
        setLive(true);
        const nextCode = message.code || code;
        setServerCode(nextCode);
        setRoom((prev) => applyRoomMessage(prev, message));
        try {
          if (sessionStorage.getItem(SPA_CREATE_KEY) === nextCode) sessionStorage.removeItem(SPA_CREATE_KEY);
        } catch {
          /* ignore */
        }
        return;
      }
      if (message.op === "tick") {
        const known = [...roomRef.current.people, ...message.upserts];
        for (const event of message.events) {
          if (event.op !== "wave" && event.op !== "heart" && event.op !== "compliment") continue;
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
        return;
      }
      if (message.op === "bye" || message.op === "replaced") {
        setLive(false);
        setRoom((prev) => applyRoomMessage(prev, message));
      }
    };

    void (async () => {
      const token = (await ensureFreshAccessToken(apiBaseUrl)) ?? getAccessToken();
      if (cancelled || !token) return;
      document.cookie = lobbyAccessCookie(token, plan, lobbyCookieMaxAge(token, Date.now()));
      let creating = false;
      try {
        creating = sessionStorage.getItem(SPA_CREATE_KEY) === code;
      } catch {
        creating = false;
      }
      phaseRef.current = creating ? "create" : "get";
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
          if (!cancelled) setLive(status === "live");
        },
      });
      if (cancelled) return;
      connRef.current = connection;
      connection.start(creating ? "create" : "get", (op) => {
        if (op === "get") return encodeRoomFrame({ op: "get", code });
        return encodeRoomFrame(memberFrame(op));
      });
    })();

    return () => {
      cancelled = true;
      connRef.current?.stop();
      connRef.current = null;
      document.cookie = clearLobbyAccessCookie(plan);
      setLive(false);
    };
  }, [active, code]);

  function showPose(id: string, pose: GamePose) {
    setPoses((prev) => ({ ...prev, [id]: pose }));
    const timer = window.setTimeout(() => {
      setPoses((prev) => ({ ...prev, [id]: null }));
    }, 1400);
    timers.current.push(timer);
  }

  const guests = useMemo(() => {
    if (notice === "full") return seatGuests(room.people, null, hidden, poses);
    if (live) return seatGuests(room.people, room.sessionId, hidden, poses);
    if (notice != null) return [];
    return sampleSpaGuests(hidden, poses);
  }, [notice, live, room.people, room.sessionId, hidden, poses]);

  const count = spaHeadCount({
    live: live && notice !== "full",
    notice,
    serverCount: room.count,
    visibleGuests: guests.length,
  });

  function emote(guest: Pick<SpaGuest, "id" | "sample">, kind: SpaEmoteKind) {
    const pose: GamePose = kind === "wave" ? "wave" : "cheer";
    showPose(guest.id, pose);
    setYouPose(pose);
    const timer = window.setTimeout(() => setYouPose(null), 1400);
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
    cap: SPA_ROOM_CAP,
    code: serverCode ?? code ?? "",
    serverCode,
    youPose,
    emote,
    hide,
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
