import {
  buildAuthHref,
  type CheckoutIntent,
} from "@/lib/premium/checkout-intent";

import { isValidAccountEmail, normalizeAccountEmail } from "./email-format";

/**
 * Session key for the register → login email handoff.
 * The address is never put on the URL, so it is not written to request logs
 * or picked up by page-view analytics.
 */
export const LOGIN_EMAIL_PREFILL_KEY = "dadiary:login-email-prefill";

const EMAIL_TAKEN_EXCLUDED_CODES = new Set(["username_taken"]);

type PrefillStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

/** Trimmed, lowercased account address. Empty when the input is blank. */
export function accountEmailKey(value: string): string {
  return normalizeAccountEmail(value).toLowerCase();
}

function readErrorCode(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const error = (body as { error?: { code?: unknown } }).error;
  return typeof error?.code === "string" ? error.code.trim().toLowerCase() : "";
}

/**
 * POST /auth/register 409 means this email already has an account
 * (`email_taken`). `username_taken` is a different 409 and stays a generic error.
 */
export function isRegisterEmailTakenResponse(status: number, body: unknown): boolean {
  if (status !== 409) return false;
  return !EMAIL_TAKEN_EXCLUDED_CODES.has(readErrorCode(body));
}

/**
 * Hold the register submit while the request is in flight, and after a 409
 * until the address itself changes. Case and surrounding space do not count
 * as an edit — that would just repeat the same account.
 */
export function isRegisterSubmitHeld(options: {
  inFlight: boolean;
  email: string;
  takenEmail: string | null;
}): boolean {
  if (options.inFlight) return true;
  if (!options.takenEmail) return false;
  return accountEmailKey(options.email) === options.takenEmail;
}

function defaultStore(): PrefillStore | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage;
}

/**
 * In-memory copy so a strict-mode remount can still read the address after
 * the first effect scheduled a clear. Not logged.
 */
let memoryPrefill: string | null = null;

/** Remember the address for the next login screen in this tab. */
export function stashLoginPrefillEmail(
  email: string,
  store: PrefillStore | null = defaultStore(),
): void {
  const key = accountEmailKey(email);
  if (!isValidAccountEmail(key)) {
    memoryPrefill = null;
    try {
      store?.removeItem(LOGIN_EMAIL_PREFILL_KEY);
    } catch {
      // ignore
    }
    return;
  }
  memoryPrefill = key;
  try {
    store?.setItem(LOGIN_EMAIL_PREFILL_KEY, key);
  } catch {
    // private mode / storage disabled — the in-memory copy still covers this tab
  }
}

/** Read the stashed address without removing it (strict-mode safe). */
export function readLoginPrefillEmail(
  store: PrefillStore | null = defaultStore(),
): string | null {
  if (memoryPrefill && isValidAccountEmail(memoryPrefill)) return memoryPrefill;
  if (!store) return null;
  try {
    const raw = store.getItem(LOGIN_EMAIL_PREFILL_KEY);
    if (!raw) return null;
    const key = accountEmailKey(raw);
    if (!isValidAccountEmail(key)) {
      store.removeItem(LOGIN_EMAIL_PREFILL_KEY);
      return null;
    }
    memoryPrefill = key;
    return key;
  } catch {
    return null;
  }
}

/** Drop the handoff so a later visit to login does not refill it. */
export function clearLoginPrefillEmail(
  store: PrefillStore | null = defaultStore(),
): void {
  memoryPrefill = null;
  try {
    store?.removeItem(LOGIN_EMAIL_PREFILL_KEY);
  } catch {
    // ignore
  }
}

/**
 * Login URL for the 409 action. Keeps checkout intent and `next` (guest
 * routine / check-in claim still runs on the login page). The email is not
 * added here — callers stash it with `stashLoginPrefillEmail`.
 */
export function buildEmailTakenLoginHref(options: {
  intent?: CheckoutIntent | null;
  next?: string | null;
}): string {
  return buildAuthHref("/login", options);
}
