import { apiBaseUrl } from "@/lib/api";
import { buildSkinCheckFormData } from "@/lib/check-in/check-in-submit";
import {
  clearLocalGuestCheckIn,
  loadGuestCheckInPhotos,
  readPersistedGuestCheckIn,
} from "@/lib/check-in/guest-check-in-persist";
import type { CreateSkinCheckResponseDTO } from "@/lib/types/skin-check";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
};

let claimInFlight: Promise<CreateSkinCheckResponseDTO | null> | null = null;

/**
 * POST the one local guest check-in onto the signed-in account, then clear it.
 * No-ops when nothing is stored. Failures leave the local copy for retry.
 */
export async function claimLocalGuestCheckInIfNeeded(
  accessToken: string,
): Promise<CreateSkinCheckResponseDTO | null> {
  const token = accessToken.trim();
  if (!token) return null;
  if (claimInFlight) return claimInFlight;

  claimInFlight = (async () => {
    const payload = readPersistedGuestCheckIn();
    if (!payload) return null;

    const files = payload.hasPhotos ? await loadGuestCheckInPhotos() : [];
    if (!payload.skipMode && files.length === 0) return null;

    const fd = buildSkinCheckFormData({
      skipMode: payload.skipMode,
      files,
      title: payload.title,
      userNote: payload.userNote,
      environmentNote: payload.environmentNote,
      conditions: payload.conditions,
      symptoms: payload.symptoms,
      skillMode: payload.skillMode,
      locale: payload.locale,
    });

    const res = await fetch(`${apiBaseUrl}/api/v1/skin-checks`, {
      method: "POST",
      body: fd,
      headers: { Authorization: `Bearer ${token}` },
    });
    const raw = (await res.json().catch(() => ({}))) as ApiEnvelope<CreateSkinCheckResponseDTO>;
    if (!res.ok || !raw?.success || !raw.data) return null;

    await clearLocalGuestCheckIn();
    return raw.data;
  })()
    .catch(() => null)
    .finally(() => {
      claimInFlight = null;
    });

  return claimInFlight;
}
