"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { apiBaseUrl } from "@/lib/api";
import { ensureFreshAccessToken, getAccessToken } from "@/lib/auth-token";
import { LOBBY_PLAYER_SPOT, LOBBY_WALK_Y_MAX } from "@/lib/mascot/game/lobby";
import type { GameLook, GamePose } from "@/lib/mascot/game/look";
import {
  DEFAULT_LOBBY_NICKNAME,
  LOBBY_NICKNAME_KEY,
  applyLobbyMessage,
  clearLobbyAccessCookie,
  emptyHall,
  encodeLobbyFrame,
  hallIsFull,
  hallOccupancy,
  isSessionId,
  lobbyAccessCookie,
  lobbyActors,
  lobbyCookieMaxAge,
  lobbyCookiePlan,
  lobbyCoord,
  lobbyPose,
  lobbySocketUrl,
  nextOpenHall,
  normalizeNickname,
  type HallSnapshot,
  type LobbyClientFrame,
  type LobbyFacing,
  type LobbyServerMessage,
} from "@/lib/mascot/game/lobby-live";
import { LobbyConnection, type LobbySocketLike } from "@/lib/mascot/game/lobby-socket";

const HIDE_KEY = "beda-lobby-hide";

export type LobbyYou = {
  x: number;
  y: number;
  facing: LobbyFacing;
  pose: GamePose | null;
  nickname: string;
};

export type LobbyEmoteKind = "wave" | "heart" | "outfit";

/**
 * Sample visitors until the shared hall answers. If the access cookie cannot
 * reach the API host, or the socket never opens, the sample hall stays.
 * The token is never added to the WebSocket URL.
 */
export function useLobbyPresence(options: {
  active: boolean;
  look: GameLook;
  onRemoteEmote?: (toast: { name: string; kind: LobbyEmoteKind }) => void;
}) {
  const { active, look, onRemoteEmote } = options;
  const [hall, setHall] = useState<HallSnapshot>(emptyHall);
  const [live, setLive] = useState(false);
  const [nickname, setNicknameState] = useState(DEFAULT_LOBBY_NICKNAME);
  const [nicknameError, setNicknameError] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [poses, setPoses] = useState<Record<string, GamePose | null>>({});
  const [you, setYou] = useState<LobbyYou>({
    x: LOBBY_PLAYER_SPOT.x,
    y: LOBBY_PLAYER_SPOT.y,
    facing: "right",
    pose: null,
    nickname: DEFAULT_LOBBY_NICKNAME,
  });

  const lookRef = useRef(look);
  const youRef = useRef(you);
  const nickRef = useRef(nickname);
  const hiddenRef = useRef(hidden);
  const hallRef = useRef(hall);
  const liveRef = useRef(live);
  const lobbyRef = useRef(0);
  const sessionRef = useRef<string | null>(null);
  const connRef = useRef<LobbyConnection | null>(null);
  const remoteRef = useRef(onRemoteEmote);
  const sentLook = useRef("");
  lookRef.current = look;
  youRef.current = you;
  nickRef.current = nickname;
  hiddenRef.current = hidden;
  hallRef.current = hall;
  liveRef.current = live;
  remoteRef.current = onRemoteEmote;

  function currentJoin(): LobbyClientFrame {
    const here = youRef.current;
    const worn = lookRef.current;
    const hide = [...hiddenRef.current].filter(isSessionId);
    return {
      op: "join",
      nickname: nickRef.current,
      outfit: worn.outfit,
      hair: worn.hair,
      accessory: worn.clip ?? "",
      x: here.x,
      y: here.y,
      facing: here.facing,
      action: "idle",
      lobby: lobbyRef.current > 0 ? lobbyRef.current : undefined,
      hide: hide.length > 0 ? hide : undefined,
    };
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOBBY_NICKNAME_KEY);
      const next = saved ? normalizeNickname(saved) : null;
      if (next) {
        nickRef.current = next;
        setNicknameState(next);
        setYou((prev) => {
          const updated = { ...prev, nickname: next };
          youRef.current = updated;
          return updated;
        });
      }
      const raw = sessionStorage.getItem(HIDE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const ids = parsed.filter((id): id is string => typeof id === "string");
      const nextHidden = new Set(ids);
      hiddenRef.current = nextHidden;
      setHidden(nextHidden);
    } catch {
      /* storage unavailable */
    }
  }, []);

  useEffect(() => {
    if (!active) {
      connRef.current?.stop();
      connRef.current = null;
      setLive(false);
      return;
    }
    const plan = readCookiePlan();
    if (!plan || !plan.ok) return;
    let cancelled = false;

    const handle = (message: LobbyServerMessage) => {
      if (message.op === "error" && message.code === "nickname_rejected") {
        setNicknameError(true);
        return;
      }
      if (message.op === "tick") {
        const known = [...hallRef.current.people, ...message.upserts];
        for (const event of message.events) {
          if (event.op !== "wave" && event.op !== "heart" && event.op !== "compliment") continue;
          if (!event.from || event.from === sessionRef.current) continue;
          const person = known.find((item) => item.id === event.from);
          if (!person || hiddenRef.current.has(person.id)) continue;
          showPose(event.from, lobbyPose(event.op) ?? "wave");
          remoteRef.current?.({
            name: person.nickname,
            kind: event.op === "compliment" ? "outfit" : event.op,
          });
        }
      }
      if (message.op === "hello") {
        sessionRef.current = message.sessionId;
        lobbyRef.current = message.lobby;
        setNicknameError(false);
      }
      if (message.op === "bye" || message.op === "replaced") {
        sessionRef.current = null;
        lobbyRef.current = 0;
      }
      setHall((prev) => applyLobbyMessage(prev, message));
    };

    void (async () => {
      const token = (await ensureFreshAccessToken(apiBaseUrl)) ?? getAccessToken();
      if (cancelled || !token) return;
      document.cookie = lobbyAccessCookie(token, plan, lobbyCookieMaxAge(token, Date.now()));
      sentLook.current = JSON.stringify(lookRef.current);
      const connection = new LobbyConnection({
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
      connRef.current = connection;
      connection.start(() => encodeLobbyFrame(currentJoin()));
    })();

    return () => {
      cancelled = true;
      connRef.current?.stop();
      connRef.current = null;
      document.cookie = clearLobbyAccessCookie(plan);
      setLive(false);
    };
  }, [active]);

  useEffect(() => {
    if (!live) return;
    const key = JSON.stringify(look);
    if (sentLook.current === key) return;
    sentLook.current = key;
    connRef.current?.send(currentJoin());
  }, [look, live]);

  function showPose(id: string, pose: GamePose) {
    setPoses((prev) => ({ ...prev, [id]: pose }));
    window.setTimeout(() => {
      setPoses((prev) => {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }, 1400);
  }

  const actors = useMemo(
    () =>
      lobbyActors({
        live,
        people: hall.people,
        selfId: hall.sessionId,
        hidden,
        poses,
      }),
    [live, hall.people, hall.sessionId, hidden, poses],
  );
  const occupancy = hallOccupancy(hall, live, actors.length + 1);

  function setNickname(raw: string): boolean {
    const next = normalizeNickname(raw);
    if (!next) {
      setNicknameError(true);
      return false;
    }
    setNicknameError(false);
    nickRef.current = next;
    setNicknameState(next);
    setYou((prev) => {
      const updated = { ...prev, nickname: next };
      youRef.current = updated;
      return updated;
    });
    try {
      localStorage.setItem(LOBBY_NICKNAME_KEY, next);
    } catch {
      /* ignore */
    }
    connRef.current?.send(currentJoin());
    return true;
  }

  function walkTo(x: number, y: number) {
    const prev = youRef.current;
    const nx = lobbyCoord(x);
    const ny = lobbyCoord(Math.min(LOBBY_WALK_Y_MAX, y));
    const facing: LobbyFacing = nx < prev.x - 0.005 ? "left" : nx > prev.x + 0.005 ? "right" : prev.facing;
    const next = { ...prev, x: nx, y: ny, facing, pose: null };
    youRef.current = next;
    setYou(next);
    if (!liveRef.current) return;
    connRef.current?.send({ op: "move-to", x: nx, y: ny, facing, action: "walk" });
  }

  function emote(actor: { id: string; sample: boolean }, kind: LobbyEmoteKind) {
    const pose: GamePose = kind === "wave" ? "wave" : "cheer";
    showPose(actor.id, pose);
    const nextYou = { ...youRef.current, pose };
    youRef.current = nextYou;
    setYou(nextYou);
    window.setTimeout(() => {
      setYou((current) => ({ ...current, pose: null }));
      youRef.current = { ...youRef.current, pose: null };
    }, 1400);
    if (actor.sample || !liveRef.current || !isSessionId(actor.id)) return;
    if (kind === "outfit") connRef.current?.send({ op: "compliment", target: actor.id });
    else connRef.current?.send({ op: kind, target: actor.id });
    window.setTimeout(() => {
      if (!liveRef.current) return;
      const here = youRef.current;
      connRef.current?.send({ op: "move-to", x: here.x, y: here.y, facing: here.facing, action: "idle" });
    }, 1400);
  }

  function hide(id: string) {
    const next = new Set(hiddenRef.current);
    next.add(id);
    hiddenRef.current = next;
    setHidden(next);
    try {
      sessionStorage.setItem(HIDE_KEY, JSON.stringify([...next]));
    } catch {
      /* ignore */
    }
    if (!liveRef.current) return;
    connRef.current?.send({ op: "hide", hide: [...next].filter(isSessionId) });
  }

  function switchHall(lobby: number) {
    if (lobby < 1) return;
    lobbyRef.current = lobby;
    connRef.current?.send({ op: "switch", lobby });
  }

  return {
    live,
    hall: occupancy.lobby,
    count: occupancy.count,
    cap: occupancy.cap,
    full: hallIsFull(hall, live),
    nextHall: nextOpenHall(hall, live),
    actors,
    you: { ...you, nickname },
    nicknameError,
    setNickname,
    walkTo,
    emote,
    hide,
    switchHall,
  };
}

function readCookiePlan() {
  if (typeof window === "undefined") return null;
  try {
    const apiHost = new URL(apiBaseUrl.includes("://") ? apiBaseUrl : `http://${apiBaseUrl}`).hostname;
    return lobbyCookiePlan(window.location.hostname, window.location.protocol, apiHost);
  } catch {
    return null;
  }
}
