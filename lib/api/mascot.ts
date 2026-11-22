import type { QueryClient } from "@tanstack/react-query";

import { ApiError, apiDelete, apiGet, apiPost } from "@/lib/api-client";
import { parseMascot, type BeDaGender, type MascotSnapshot } from "@/lib/mascot/model";
import { mascotQueryKey } from "@/lib/mascot/query-key";

export { mascotQueryKey };

/**
 * GET /api/v1/me/mascot. A 404 means there is no mascot to show —
 * callers hide Bé Da. Other errors throw.
 */
export async function fetchMascot(): Promise<MascotSnapshot | null> {
  try {
    const data = await apiGet<unknown>("/api/v1/me/mascot", { toastOnError: false });
    return parseMascot(data);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

let glowSeen: Promise<void> | null = null;

/** POST /api/v1/me/mascot/glow/seen. Repeated calls share one request until the level-up clears. */
export function markMascotGlowSeen(): Promise<void> {
  if (glowSeen) return glowSeen;
  glowSeen = apiPost("/api/v1/me/mascot/glow/seen", undefined, { toastOnError: false })
    .then(() => undefined)
    .catch((err: unknown) => {
      glowSeen = null;
      throw err;
    });
  return glowSeen;
}

/** POST /api/v1/me/mascot/intro. Saves gender and marks the intro as seen. */
export async function saveMascotIntro(gender: BeDaGender): Promise<MascotSnapshot> {
  const data = await apiPost<unknown>("/api/v1/me/mascot/intro", { gender }, { toastOnError: false });
  return parseMascot(data);
}

export type IntroResetResult = "ok" | "missing" | "failed";

/**
 * DELETE /api/v1/me/mascot/intro. Admin only.
 * 200 `{ introSeen: false }`. A non-admin gets 404.
 */
export async function resetMascotIntro(): Promise<{ introSeen: false }> {
  const data = await apiDelete<unknown>("/api/v1/me/mascot/intro", { toastOnError: false });
  if (data && typeof data === "object") {
    const row = data as Record<string, unknown>;
    const seen = "introSeen" in row ? row.introSeen : "intro_seen" in row ? row.intro_seen : undefined;
    if (seen === true) throw new ApiError("api", { status: 200 });
  }
  return { introSeen: false };
}

/** Marks the cached mascot unseen, then refetches so the next Bắt đầu opens the picker. */
export async function commitIntroReset(queryClient: QueryClient): Promise<IntroResetResult> {
  try {
    await resetMascotIntro();
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return "missing";
    return "failed";
  }
  queryClient.setQueryData<MascotSnapshot | null>(mascotQueryKey, (current) => {
    if (!current) return current;
    return { ...current, introSeen: false };
  });
  await queryClient.invalidateQueries({ queryKey: mascotQueryKey });
  return "ok";
}

/** Allow the next level-up to acknowledge again. */
export function resetMascotGlowSeen(): void {
  glowSeen = null;
}
