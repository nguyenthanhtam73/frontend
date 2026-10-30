import { FUNNEL_EVENTS, trackFunnelEvent } from "@/lib/analytics/funnel";
import {
  FIRST_PARTY_FUNNEL_EVENTS,
  sendFunnelEvent,
  type CheckInFunnelContext,
} from "@/lib/analytics/funnel-events";

import type { PhotoBlurChoice, PhotoBlurVia } from "./photo-blur-warning";

/**
 * Check-in blur warning measurement.
 *
 * `checkin_photo_blur_shown` — the warning was displayed for one staged photo.
 * `checkin_photo_blur_choice` — the user chose `retake` or `send_anyway`.
 *
 * Props are only slot, score, choice, and via, plus the existing check-in
 * context on the first-party ingest. No filename, blob URL, or photo URL.
 * `score` is the contrast-normalized Laplacian variance, rounded to 2 decimals,
 * so the threshold can be retuned from the distribution of warned photos.
 */

export type PhotoBlurShownProps = {
  slot: 0 | 1;
  score: number;
};

export type PhotoBlurChoiceProps = PhotoBlurShownProps & {
  choice: PhotoBlurChoice;
  via: PhotoBlurVia;
};

export function roundBlurScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.round(score * 100) / 100;
}

export function buildPhotoBlurShownProps(slot: 0 | 1, score: number): PhotoBlurShownProps {
  return { slot, score: roundBlurScore(score) };
}

export function buildPhotoBlurChoiceProps(input: {
  slot: 0 | 1;
  score: number;
  choice: PhotoBlurChoice;
  via: PhotoBlurVia;
}): PhotoBlurChoiceProps {
  return {
    slot: input.slot,
    score: roundBlurScore(input.score),
    choice: input.choice,
    via: input.via,
  };
}

export function reportPhotoBlurShown(
  slot: 0 | 1,
  score: number,
  context?: CheckInFunnelContext,
): void {
  try {
    const props = buildPhotoBlurShownProps(slot, score);
    trackFunnelEvent(FUNNEL_EVENTS.checkInPhotoBlurShown, props);
    sendFunnelEvent(FIRST_PARTY_FUNNEL_EVENTS.checkInPhotoBlurShown, {
      ...(context ?? {}),
      ...props,
    });
  } catch {
    /* analytics must not break check-in */
  }
}

export function reportPhotoBlurChoice(
  input: {
    slot: 0 | 1;
    score: number;
    choice: PhotoBlurChoice;
    via: PhotoBlurVia;
  },
  context?: CheckInFunnelContext,
): void {
  try {
    const props = buildPhotoBlurChoiceProps(input);
    trackFunnelEvent(FUNNEL_EVENTS.checkInPhotoBlurChoice, props);
    sendFunnelEvent(FIRST_PARTY_FUNNEL_EVENTS.checkInPhotoBlurChoice, {
      ...(context ?? {}),
      ...props,
    });
  } catch {
    /* analytics must not break check-in */
  }
}
