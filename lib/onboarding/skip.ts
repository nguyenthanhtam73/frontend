import { apiBaseUrl } from "@/lib/api";
import { authHeaders, ensureFreshAccessToken } from "@/lib/auth-token";
import { ONBOARDING_SKIPPED_KEY_PREFIX } from "@/lib/onboarding/constants";

function skipKey(userId: string): string {
  return `${ONBOARDING_SKIPPED_KEY_PREFIX}${userId}`;
}

/** True when this auth user chose “Enter app” without finishing onboarding (local cache). */
export function hasSkippedOnboarding(userId: string | null | undefined): boolean {
  if (typeof window === "undefined" || !userId) return false;
  try {
    return localStorage.getItem(skipKey(userId)) === "1";
  } catch {
    return false;
  }
}

/** Record skip locally so login / gate does not loop before /me lands. */
export function markOnboardingSkipped(userId: string): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.setItem(skipKey(userId), "1");
  } catch {
    /* private mode / quota */
  }
}

/** Clear skip after complete or delete so the gate can prompt again. */
export function clearOnboardingSkipped(userId: string | null | undefined): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.removeItem(skipKey(userId));
  } catch {
    /* ignore */
  }
}

/**
 * Persist skip on the server (users.onboarding_skipped) and mirror locally.
 * Local write is optimistic so the gate works even if the request is slow.
 */
export async function persistOnboardingSkipped(userId: string): Promise<void> {
  markOnboardingSkipped(userId);
  const token = await ensureFreshAccessToken(apiBaseUrl);
  if (!token) {
    throw new Error("onboarding/skip: no access token");
  }
  const res = await fetch(`${apiBaseUrl}/api/v1/profile/onboarding/skip`, {
    method: "POST",
    headers: { ...authHeaders(), Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`onboarding/skip ${res.status}`);
  }
}
