import {
  encodeLobbyFrame,
  parseLobbyMessage,
  reconnectDelayMs,
  LobbyOutbox,
  type LobbyClientFrame,
  type LobbyServerMessage,
} from "@/lib/mascot/game/lobby-live";

export type LobbySocketLike = {
  url?: string;
  send: (data: string) => void;
  close: () => void;
  readyState: number;
  onopen: (() => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
};

const OPEN = 1;

/**
 * One lobby socket. Sends are capped at 2 per rolling second (`leave` is not
 * capped). A dropped socket reconnects with exponential backoff, unless this
 * tab sent `leave` or the server said `replaced`.
 */
export class LobbyConnection {
  private ws: LobbySocketLike | null = null;
  private intentional = false;
  private replaced = false;
  private attempt = 0;
  private timer: number | null = null;
  private pumpTimer: number | null = null;
  private readonly outbox = new LobbyOutbox();
  private joinBody: (() => string) | null = null;

  constructor(
    private readonly deps: {
      url: string;
      now: () => number;
      connect: (url: string) => LobbySocketLike;
      setTimer: (fn: () => void, ms: number) => number;
      clearTimer: (id: number) => void;
      onMessage: (message: LobbyServerMessage) => void;
      onStatus: (status: "sample" | "live") => void;
    },
  ) {}

  get url(): string {
    return this.deps.url;
  }

  start(joinBody: () => string): void {
    this.joinBody = joinBody;
    this.intentional = false;
    this.replaced = false;
    this.attempt = 0;
    this.open();
  }

  /** Tell the server we left, then stop. No reconnect. */
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

  send(frame: LobbyClientFrame): void {
    if (frame.op === "leave") {
      this.sendLeave();
      return;
    }
    this.outbox.enqueue(frame.op, encodeLobbyFrame(frame));
    this.pump();
  }

  private sendLeave(): void {
    const ws = this.ws;
    if (!ws || ws.readyState !== OPEN) return;
    try {
      ws.send(encodeLobbyFrame({ op: "leave" }));
    } catch {
      /* socket already dying */
    }
  }

  private open(): void {
    if (this.intentional || this.replaced) return;
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
      this.deps.onStatus("sample");
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      const join = this.joinBody?.();
      if (!join || this.ws !== ws || ws.readyState !== OPEN) return;
      this.outbox.enqueue("join", join);
      this.pump();
    };
    ws.onmessage = (event) => {
      if (this.ws !== ws) return;
      const text = typeof event.data === "string" ? event.data : "";
      const message = parseLobbyMessage(text);
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
      /* close follows; sample lobby stays up */
    };
    ws.onclose = () => {
      if (this.ws === ws) this.ws = null;
      if (this.intentional || this.replaced) return;
      this.deps.onStatus("sample");
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    if (this.intentional || this.replaced || this.timer != null) return;
    const delay = reconnectDelayMs(this.attempt);
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
