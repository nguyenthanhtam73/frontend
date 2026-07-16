import type { ToastOptions } from "@/hooks/use-toast";

/** Bridge between plain (non-React) modules and the React toast system.
 *
 *  `lib/api-client.ts` runs outside React, so it can't call `useToast()`. The
 *  <ToastBridge /> component registers the live dispatcher + localized copy here
 *  on mount; the API client reads through these singletons. Everything is a
 *  no-op until registration, so calling from the server or before hydration is
 *  safe. */

type ToastHandler = (opts: ToastOptions) => void;

/** Error categories the network layer can surface (mirrors ApiError kinds). */
export type NetErrorKind =
  | "offline"
  | "network"
  | "timeout"
  | "unauthorized"
  | "forbidden"
  | "server"
  | "parse"
  | "unknown";

let toastHandler: ToastHandler | null = null;
let netErrorCopy: Record<NetErrorKind, string> | null = null;

export function setToastHandler(fn: ToastHandler | null): void {
  toastHandler = fn;
}

/** True when <ToastBridge /> has registered a live dispatcher. */
export function hasToastHandler(): boolean {
  return toastHandler != null;
}

/**
 * Fire a toast if a handler is registered.
 * Returns whether the toast was handed off (SW uses this for OS fallback).
 */
export function pushToast(opts: ToastOptions): boolean {
  if (!toastHandler) return false;
  toastHandler(opts);
  return true;
}

export function setNetErrorCopy(copy: Record<NetErrorKind, string>): void {
  netErrorCopy = copy;
}

/** Localized fallback message for a given error kind (undefined until registered). */
export function getNetErrorCopy(kind: NetErrorKind): string | undefined {
  return netErrorCopy?.[kind];
}
