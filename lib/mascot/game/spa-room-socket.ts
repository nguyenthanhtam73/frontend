import { LobbyOutbox, lobbySocketUrl, reconnectDelayMs } from "@/lib/mascot/game/lobby-live";
import type { LobbySocketLike } from "@/lib/mascot/game/lobby-socket";
import {
  encodeRoomFrame,
  parseRoomMessage,
  type RoomServerMessage,
} from "@/lib/mascot/game/spa-room";

export { lobbySocketUrl };

const OPEN = 1;

/**
 * One room socket on the lobby URL. The only opener is `join` with
 * channel "room" and the code. Membership is already done over REST.
 * `not_available` or `fail()` stops reconnects. `leave` and `replaced` do not
 * reconnect. A drop before that waits with the lobby backoff.
 */
export class RoomConnection {
  private ws: LobbySocketLike | null = null;
  private intentional = false;
  private replaced = false;
  private unavailable = false;
  private attempt = 0;
  private timer: number | null = null;
  private pumpTimer: number | null = null;
  private readonly outbox = new LobbyOutbox();
  private joinBody: () => string = () => "";

  constructor(
    private readonly deps: {
      url: string;
      now: () => number;
      connect: (url: string) => LobbySocketLike;
      setTimer: (fn: () => void, ms: number) => number;
      clearTimer: (id: number) => void;
      onMessage: (message: RoomServerMessage) => void;
      onStatus: (status: "sample" | "live") => void;
      /** [0, 1). Defaults to Math.random. Tests pass a fixed roll. */
      random?: () => number;
    },
  ) {}

  start(joinBody: () => string): void {
    this.joinBody = joinBody;
    this.intentional = false;
    this.replaced = false;
    this.unavailable = false;
    this.attempt = 0;
    this.open();
  }

  /** Stop reconnecting without telling the server we left. */
  fail(): void {
    this.unavailable = true;
    this.clearTimers();
    const ws = this.ws;
    this.ws = null;
    try {
      ws?.close();
    } catch {
      /* already closed */
    }
    this.outbox.clear();
    this.deps.onStatus("sample");
  }

  send(body: string, kind: string): void {
    this.outbox.enqueue(kind, body);
    this.pump();
  }

  stop(): void {
    this.intentional = true;
    this.clearTimers();
    this.sendLeave();
    const ws = this.ws;
    this.ws = null;
    try {
      ws?.close();
    } catch {
      /* already closed */
    }
    this.outbox.clear();
    this.deps.onStatus("sample");
  }

  private sendLeave(): void {
    const ws = this.ws;
    if (!ws || ws.readyState !== OPEN) return;
    try {
      ws.send(encodeRoomFrame({ op: "leave" }));
    } catch {
      /* socket already dying */
    }
  }

  private open(): void {
    if (this.intentional || this.replaced || this.unavailable) return;
    this.outbox.clear();
    let ws: LobbySocketLike;
    try {
      ws = this.deps.connect(this.deps.url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    if (typeof ws.url === "string" && ws.url.includes("access_token")) {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      this.unavailable = true;
      this.deps.onStatus("sample");
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      if (this.ws !== ws || ws.readyState !== OPEN) return;
      this.outbox.enqueue("join", this.joinBody());
      this.pump();
    };
    ws.onmessage = (event) => {
      if (this.ws !== ws) return;
      const text = typeof event.data === "string" ? event.data : "";
      const message = parseRoomMessage(text);
      if (message.op === "error" && message.code === "not_available") {
        this.unavailable = true;
        this.clearTimers();
        this.deps.onMessage(message);
        this.deps.onStatus("sample");
        try {
          ws.close();
        } catch {
          /* already closed */
        }
        return;
      }
      if (message.op === "hello") this.attempt = 0;
      if (message.op === "replaced") {
        this.replaced = true;
        this.clearTimers();
      }
      this.deps.onMessage(message);
      if (message.op === "hello") this.deps.onStatus("live");
      if (message.op === "replaced" || message.op === "bye") this.deps.onStatus("sample");
    };
    ws.onerror = () => {
      /* close follows; the sample room stays up */
    };
    ws.onclose = () => {
      if (this.ws === ws) this.ws = null;
      if (this.intentional || this.replaced || this.unavailable) return;
      this.deps.onStatus("sample");
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.intentional || this.replaced || this.unavailable || this.timer != null) return;
    const delay = reconnectDelayMs(this.attempt, this.deps.random ?? Math.random);
    this.attempt += 1;
    this.timer = this.deps.setTimer(() => {
      this.timer = null;
      this.open();
    }, delay);
  }

  private pump(): void {
    if (this.pumpTimer != null) return;
    const ws = this.ws;
    if (!ws || ws.readyState !== OPEN) return;
    const frames = this.outbox.take(this.deps.now());
    for (const frame of frames) {
      try {
        ws.send(frame);
      } catch {
        return;
      }
    }
    const wait = this.outbox.waitMs(this.deps.now());
    if (wait > 0) {
      this.pumpTimer = this.deps.setTimer(() => {
        this.pumpTimer = null;
        this.pump();
      }, wait);
    }
  }

  private clearTimers(): void {
    if (this.timer != null) this.deps.clearTimer(this.timer);
    if (this.pumpTimer != null) this.deps.clearTimer(this.pumpTimer);
    this.timer = null;
    this.pumpTimer = null;
  }
}
