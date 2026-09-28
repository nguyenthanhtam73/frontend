/**
 * Install prompts (iOS banner + Android/desktop toast) only appear once the
 * visitor has completed a check-in on this device: a first-time visitor from
 * an ad should see the product before being asked to install it.
 */

const STORAGE_KEY = "dadiary:install-eligible-at";
const EVENT_NAME = "dadiary:install-eligible";

export function hasEarnedInstallPrompt(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/** Call after a check-in succeeds (signed-in submit, guest save, or guest claim). */
export function markInstallPromptEarned(): void {
  if (typeof window === "undefined") return;
  if (hasEarnedInstallPrompt()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // private mode: still let this tab show the prompt
  }
  window.dispatchEvent(new Event(EVENT_NAME));
}

/** Runs `cb` once the prompt is earned — immediately if it already is. Returns an unsubscribe. */
export function whenInstallPromptEarned(cb: () => void): () => void {
  if (hasEarnedInstallPrompt()) {
    cb();
    return () => {};
  }
  window.addEventListener(EVENT_NAME, cb, { once: true });
  return () => window.removeEventListener(EVENT_NAME, cb);
}
