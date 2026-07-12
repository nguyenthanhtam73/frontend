"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/** Global toast system (context + hook), no external dependency.
 *
 *  - `<ToastProvider>` owns the queue + auto-dismiss timers and exposes an API
 *    via context. Mount it once near the root and render `<Toaster />` inside it.
 *  - `useToast()` gives any component the dispatch API (`toast`, `success`, …).
 *  - `useToastViewport()` is the read side consumed by `<Toaster />`. */

export type ToastVariant = "success" | "error" | "warning" | "info" | "default";

export type ToastPosition =
  | "top-right"
  | "top-left"
  | "top-center"
  | "bottom-right"
  | "bottom-left"
  | "bottom-center";

export type ToastOptions = {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  /** ms before auto-dismiss. Pass `0` or `Infinity` to keep it until dismissed. */
  duration?: number;
};

/** A string is treated as the `title`; otherwise pass full options. */
type ToastInput = string | Omit<ToastOptions, "variant">;

export type ToastRecord = {
  id: string;
  title?: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
  /** Set while the exit animation plays, just before removal from the DOM. */
  exiting: boolean;
};

const DEFAULT_DURATION = 4500;
const EXIT_ANIM_MS = 200;
const MAX_TOASTS = 4;

type ToastContextValue = {
  toasts: ToastRecord[];
  position: ToastPosition;
  toast: (opts: ToastOptions) => string;
  success: (input: ToastInput) => string;
  error: (input: ToastInput) => string;
  warning: (input: ToastInput) => string;
  info: (input: ToastInput) => string;
  dismiss: (id: string) => void;
  pause: (id: string) => void;
  resume: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

/** Per-toast auto-dismiss timer bookkeeping so we can pause/resume on hover. */
type TimerMeta = {
  timeoutId: ReturnType<typeof setTimeout> | null;
  remaining: number;
  startedAt: number;
};

function normalize(input: ToastInput, variant: ToastVariant): ToastOptions {
  return typeof input === "string"
    ? { title: input, variant }
    : { ...input, variant };
}

export function ToastProvider({
  children,
  position = "top-right",
}: {
  children: ReactNode;
  position?: ToastPosition;
}) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timers = useRef(new Map<string, TimerMeta>());
  const idRef = useRef(0);

  // Hard-remove a toast (after its exit animation has played).
  const remove = useCallback((id: string) => {
    const meta = timers.current.get(id);
    if (meta?.timeoutId) clearTimeout(meta.timeoutId);
    timers.current.delete(id);
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  // Begin the exit animation, then remove once it's done.
  const dismiss = useCallback(
    (id: string) => {
      const meta = timers.current.get(id);
      if (meta?.timeoutId) clearTimeout(meta.timeoutId);
      setToasts((list) =>
        list.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
      );
      const exitTimer = setTimeout(() => remove(id), EXIT_ANIM_MS);
      timers.current.set(id, { timeoutId: exitTimer, remaining: 0, startedAt: Date.now() });
    },
    [remove],
  );

  // Start (or restart) the auto-dismiss countdown for a toast.
  const startTimer = useCallback(
    (id: string, duration: number) => {
      if (!Number.isFinite(duration) || duration <= 0) return; // sticky toast
      const timeoutId = setTimeout(() => dismiss(id), duration);
      timers.current.set(id, { timeoutId, remaining: duration, startedAt: Date.now() });
    },
    [dismiss],
  );

  // Pause on hover so users get time to read / click.
  const pause = useCallback((id: string) => {
    const meta = timers.current.get(id);
    if (!meta || !meta.timeoutId) return;
    clearTimeout(meta.timeoutId);
    const elapsed = Date.now() - meta.startedAt;
    meta.remaining = Math.max(0, meta.remaining - elapsed);
    meta.timeoutId = null;
  }, []);

  const resume = useCallback(
    (id: string) => {
      const meta = timers.current.get(id);
      if (!meta || meta.timeoutId) return;
      if (meta.remaining <= 0) {
        dismiss(id);
        return;
      }
      meta.timeoutId = setTimeout(() => dismiss(id), meta.remaining);
      meta.startedAt = Date.now();
    },
    [dismiss],
  );

  const toast = useCallback(
    (opts: ToastOptions) => {
      const id = `toast-${++idRef.current}-${Date.now()}`;
      const duration = opts.duration ?? DEFAULT_DURATION;
      const record: ToastRecord = {
        id,
        title: opts.title,
        description: opts.description,
        variant: opts.variant ?? "default",
        duration,
        exiting: false,
      };
      setToasts((list) => {
        const next = [...list, record];
        // Cap the stack so a burst of toasts can't cover the screen; drop oldest.
        return next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next;
      });
      startTimer(id, duration);
      return id;
    },
    [startTimer],
  );

  const success = useCallback(
    (input: ToastInput) => toast(normalize(input, "success")),
    [toast],
  );
  const error = useCallback(
    (input: ToastInput) => toast(normalize(input, "error")),
    [toast],
  );
  const warning = useCallback(
    (input: ToastInput) => toast(normalize(input, "warning")),
    [toast],
  );
  const info = useCallback(
    (input: ToastInput) => toast(normalize(input, "info")),
    [toast],
  );

  // Clear every pending timer if the provider unmounts.
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((m) => {
        if (m.timeoutId) clearTimeout(m.timeoutId);
      });
      map.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({ toasts, position, toast, success, error, warning, info, dismiss, pause, resume }),
    [toasts, position, toast, success, error, warning, info, dismiss, pause, resume],
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

function useToastContext(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a <ToastProvider>.");
  }
  return ctx;
}

/** Dispatch API for feature components. */
export function useToast() {
  const { toast, success, error, warning, info, dismiss } = useToastContext();
  return { toast, success, error, warning, info, dismiss };
}

/** Read side for the <Toaster /> renderer. */
export function useToastViewport() {
  const { toasts, dismiss, pause, resume, position } = useToastContext();
  return { toasts, dismiss, pause, resume, position };
}
