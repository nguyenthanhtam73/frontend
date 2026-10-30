export const PHOTO_BLUR_CHOICES = ["retake", "send_anyway"] as const;

export type PhotoBlurChoice = (typeof PHOTO_BLUR_CHOICES)[number];

export type PhotoBlurVia = "button" | "submit";

/** One slot's blur decision, keyed by the blob URL of the staged photo. */
export type BlurSlotState = {
  url: string;
  phase: "warning" | "dismissed";
  score: number;
  trackedChoice: PhotoBlurChoice | null;
};

export type BlurSlotList = [BlurSlotState | null, BlurSlotState | null];

export type BlurSample = { blurry: boolean; score: number } | null;

export function emptyBlurSlots(): BlurSlotList {
  return [null, null];
}

export function isBlurWarningVisible(
  slot: BlurSlotState | null | undefined,
  url: string | null | undefined,
): boolean {
  return !!url && !!slot && slot.url === url && slot.phase === "warning";
}

/**
 * Record a finished sample for the photo at `url`.
 * A failed sample (`null`) or a sharp sample never opens a warning.
 * A decision already stored for this exact url is left alone so the
 * "shown" event fires once.
 */
export function applyBlurSample(
  slots: BlurSlotList,
  index: 0 | 1,
  url: string,
  sample: BlurSample,
): { slots: BlurSlotList; reveal: boolean } {
  const current = slots[index];
  if (current?.url === url) return { slots, reveal: false };

  const sharp = !sample || !sample.blurry || !Number.isFinite(sample.score);
  if (sharp) {
    if (!current) return { slots, reveal: false };
    const next = slots.slice() as BlurSlotList;
    next[index] = null;
    return { slots: next, reveal: false };
  }

  const next = slots.slice() as BlurSlotList;
  next[index] = {
    url,
    phase: "warning",
    score: sample.score,
    trackedChoice: null,
  };
  return { slots: next, reveal: true };
}

export function clearBlurSlot(slots: BlurSlotList, index: 0 | 1): BlurSlotList {
  if (!slots[index]) return slots;
  const next = slots.slice() as BlurSlotList;
  next[index] = null;
  return next;
}

/**
 * Retake keeps the warning up so cancelling the camera picker does not hide it.
 * Send-anyway dismisses the warning and leaves the photo in place.
 * Each choice is tracked at most once per staged photo.
 */
export function chooseBlurSlot(
  slots: BlurSlotList,
  index: 0 | 1,
  url: string,
  choice: PhotoBlurChoice,
): { slots: BlurSlotList; track: boolean; score: number } {
  const current = slots[index];
  if (!current || current.url !== url || current.phase !== "warning") {
    return { slots, track: false, score: current?.score ?? 0 };
  }
  if (choice === "retake") {
    if (current.trackedChoice === "retake") {
      return { slots, track: false, score: current.score };
    }
    const next = slots.slice() as BlurSlotList;
    next[index] = { ...current, trackedChoice: "retake" };
    return { slots: next, track: true, score: current.score };
  }
  if (current.trackedChoice === "send_anyway") {
    return { slots, track: false, score: current.score };
  }
  const next = slots.slice() as BlurSlotList;
  next[index] = { ...current, phase: "dismissed", trackedChoice: "send_anyway" };
  return { slots: next, track: true, score: current.score };
}

/** Form submit: any warning still open counts as send-anyway. Does not remove photos. */
export function acknowledgeBlurSend(slots: BlurSlotList): {
  slots: BlurSlotList;
  tracks: { slot: 0 | 1; score: number }[];
} {
  const tracks: { slot: 0 | 1; score: number }[] = [];
  const next = slots.slice() as BlurSlotList;
  let changed = false;
  for (const index of [0, 1] as const) {
    const current = next[index];
    if (!current || current.phase !== "warning") continue;
    if (current.trackedChoice === "send_anyway") continue;
    next[index] = { ...current, phase: "dismissed", trackedChoice: "send_anyway" };
    tracks.push({ slot: index, score: current.score });
    changed = true;
  }
  return { slots: changed ? next : slots, tracks };
}
