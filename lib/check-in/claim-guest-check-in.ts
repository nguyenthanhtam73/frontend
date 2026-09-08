import { FUNNEL_EVENTS, trackFunnelEvent } from "@/lib/analytics/funnel";
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

/** Why a guest check-in claim succeeded or was skipped/failed. */
export type GuestCheckInClaimReason =
  | "ok"
  | "no_token"
  | "no_payload"
  | "photos_missing"
  | "network"
  | `http_${number}`;

export type GuestCheckInClaimResult =
  | { ok: true; reason: "ok"; data: CreateSkinCheckResponseDTO }
  | { ok: false; reason: Exclude<GuestCheckInClaimReason, "ok">; data: null };

let claimInFlight: Promise<GuestCheckInClaimResult> | null = null;

export function guestCheckInHttpReason(status: number): `http_${number}` {
  const code = Number.isFinite(status) ? Math.trunc(status) : 0;
  return `http_${code}`;
}

/** Failures that should toast / show the signed-in retry card. */
export function isGuestCheckInClaimFailure(
  result: GuestCheckInClaimResult,
): boolean {
  return !result.ok && result.reason !== "no_payload" && result.reason !== "no_token";
}

export function isGuestCheckInPhotosMissing(
  reason: GuestCheckInClaimReason | null | undefined,
): boolean {
  return reason === "photos_missing";
}

function trackClaim(result: GuestCheckInClaimResult): GuestCheckInClaimResult {
  if (result.reason === "no_token") return result;
  trackFunnelEvent(FUNNEL_EVENTS.guestCheckInClaim, {
    ok: result.ok,
    reason: result.reason,
  });
  if (result.ok) {
    // Custom-only — firstCheckIn is not mapped to a Meta standard event.
    trackFunnelEvent(FUNNEL_EVENTS.firstCheckIn, { surface: "guest_claim" });
  }
  return result;
}

function fail(reason: Exclude<GuestCheckInClaimReason, "ok">): GuestCheckInClaimResult {
  return { ok: false, reason, data: null };
}

/**
 * POST the one local guest check-in onto the signed-in account, then clear it.
 * No-ops when nothing is stored. Failures leave the local copy for retry.
 */
export async function claimLocalGuestCheckInIfNeeded(
  accessToken: string,
): Promise<GuestCheckInClaimResult> {
  const token = accessToken.trim();
  if (!token) return fail("no_token");
  if (claimInFlight) return claimInFlight;

  claimInFlight = (async () => {
    const payload = readPersistedGuestCheckIn();
    if (!payload) return trackClaim(fail("no_payload"));

    const files = payload.hasPhotos ? await loadGuestCheckInPhotos() : [];
    if (!payload.skipMode && files.length === 0) {
      return trackClaim(fail("photos_missing"));
    }

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

    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/skin-checks`, {
        method: "POST",
        body: fd,
        headers: { Authorization: `Bearer ${token}` },
      });
      const raw = (await res.json().catch(() => ({}))) as ApiEnvelope<CreateSkinCheckResponseDTO>;
      if (!res.ok || !raw?.success || !raw.data) {
        return trackClaim(fail(guestCheckInHttpReason(res.status)));
      }

      await clearLocalGuestCheckIn();
      return trackClaim({ ok: true, reason: "ok", data: raw.data });
    } catch {
      return trackClaim(fail("network"));
    }
  })().finally(() => {
    claimInFlight = null;
  });

  return claimInFlight;
}
