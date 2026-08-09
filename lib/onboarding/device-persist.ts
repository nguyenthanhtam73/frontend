/** Tiny cookie helpers for device-local onboarding flags (guest trial). */

export function readDeviceFlag(name: string): boolean {
  if (typeof document === "undefined") return false;
  try {
    const parts = document.cookie.split("; ");
    const prefix = `${name}=`;
    for (const part of parts) {
      if (part.startsWith(prefix)) {
        const v = part.slice(prefix.length);
        return v === "1" || v === "true";
      }
    }
  } catch {
    /* ignore */
  }
  return false;
}

export function writeDeviceFlag(name: string, on: boolean, maxAgeSec = 60 * 60 * 24 * 365): void {
  if (typeof document === "undefined") return;
  try {
    if (on) {
      document.cookie = `${name}=1; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax`;
    } else {
      document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
    }
  } catch {
    /* private mode / quota */
  }
}
