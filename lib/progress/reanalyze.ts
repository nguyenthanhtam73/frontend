/** Progress 「Soi lại da」 helpers — CTA gate, 422/429 mapping, poll cadence. */

import { ApiError } from "@/lib/api-client";
import {
  isAnalysisSettled,
  type FetchSkinCheckResult,
} from "@/lib/api/skin-check";
import type { ProgressEntryDTO } from "@/lib/types/progress";
import type { CreateSkinCheckResponseDTO } from "@/lib/types/skin-check";

/** Matches check-in `useCheckInFeedback`: 1s for 20s, then 2.5s; stop at 160s. */
export const REANALYZE_POLL = {
  fastMs: 1000,
  slowMs: 2500,
  phaseSwitchMs: 20_000,
  timeoutMs: 160_000,
  maxNetworkRetries: 3,
  networkRetryMs: 1500,
} as const;

const SNIPPET_MAX = 160;

export function hasStoredProgressPhotos(
  imageUrls: string[] | null | undefined,
): boolean {
  return (imageUrls ?? []).some((u) => typeof u === "string" && u.trim().length > 0);
}

/** CTA only on photo entries whose analysis already finished (`completed` / `failed`). */
export function canShowReanalyzeCta(
  entry: Pick<ProgressEntryDTO, "status" | "image_urls">,
): boolean {
  return (
    hasStoredProgressPhotos(entry.image_urls) &&
    (entry.status === "completed" || entry.status === "failed")
  );
}

export function reanalyzePollDelayMs(elapsedMs: number): number {
  return elapsedMs < REANALYZE_POLL.phaseSwitchMs
    ? REANALYZE_POLL.fastMs
    : REANALYZE_POLL.slowMs;
}

export type ReanalyzeErrorKind =
  | "validation"
  | "daily_limit"
  | "rate_limit"
  | "network"
  | "timeout"
  | "aborted"
  | "unknown";

export class ReanalyzePollTimeoutError extends Error {
  constructor() {
    super("reanalyze poll timeout");
    this.name = "ReanalyzePollTimeoutError";
  }
}

export function classifyReanalyzeError(err: unknown): ReanalyzeErrorKind {
  if (err instanceof ReanalyzePollTimeoutError) return "timeout";
  if (isAbortLike(err)) return "aborted";
  if (err instanceof ApiError) {
    if (err.status === 422 || err.code === "photos_required") return "validation";
    if (err.code === "reanalyze_limit") return "daily_limit";
    if (err.kind === "rate_limited" || err.status === 429) return "rate_limit";
    if (err.kind === "network" || err.kind === "timeout" || err.kind === "offline") {
      return "network";
    }
    return "unknown";
  }
  return "unknown";
}

export function clipProgressSnippet(notes: string): string {
  const s = notes.trim();
  if (s.length <= SNIPPET_MAX) return s;
  return `${s.slice(0, SNIPPET_MAX - 1).trimEnd()}…`;
}

export function applySkinCheckToProgressEntry(
  entry: ProgressEntryDTO,
  data: CreateSkinCheckResponseDTO,
): ProgressEntryDTO {
  const raw = data.analysis?.status;
  const status: ProgressEntryDTO["status"] =
    raw === "pending" ||
    raw === "processing" ||
    raw === "completed" ||
    raw === "failed"
      ? raw
      : entry.status;

  const next: ProgressEntryDTO = {
    ...entry,
    status,
    image_urls:
      Array.isArray(data.image_urls) && data.image_urls.length > 0
        ? data.image_urls
        : entry.image_urls,
  };

  if (status === "completed") {
    const notes = data.analysis.coach?.summary_notes?.trim();
    if (notes) next.snippet = clipProgressSnippet(notes);
    else delete next.snippet;
  } else {
    delete next.snippet;
  }

  const gauges = data.analysis.coach?.skin_score_gauges;
  if (gauges) {
    next.gauges = { ...entry.gauges, ...gauges };
  }

  return next;
}

export async function pollUntilSkinCheckSettled(
  id: string,
  opts: {
    fetchResult: (id: string) => Promise<FetchSkinCheckResult>;
    onTick?: (data: CreateSkinCheckResponseDTO) => void;
    sleep?: (ms: number) => Promise<void>;
    now?: () => number;
    isAborted?: () => boolean;
  },
): Promise<CreateSkinCheckResponseDTO> {
  const sleep = opts.sleep ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = opts.now ?? Date.now;
  const startedAt = now();
  let networkRetries = 0;

  for (;;) {
    throwIfAborted(opts.isAborted);
    const elapsed = now() - startedAt;
    if (elapsed >= REANALYZE_POLL.timeoutMs) {
      throw new ReanalyzePollTimeoutError();
    }

    await sleep(reanalyzePollDelayMs(elapsed));
    throwIfAborted(opts.isAborted);

    const result = await opts.fetchResult(id);
    throwIfAborted(opts.isAborted);

    if (result.ok) {
      networkRetries = 0;
      opts.onTick?.(result.data);
      if (isAnalysisSettled(result.data.analysis.status)) {
        return result.data;
      }
      continue;
    }

    if (result.kind === "not_found" || result.kind === "unauthorized") {
      throw new Error(result.kind);
    }

    networkRetries += 1;
    if (networkRetries > REANALYZE_POLL.maxNetworkRetries) {
      throw new Error("network");
    }
    await sleep(REANALYZE_POLL.networkRetryMs);
  }
}

function isAbortLike(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name?: string }).name === "AbortError"
  );
}

function throwIfAborted(isAborted?: () => boolean): void {
  if (!isAborted?.()) return;
  const err = new Error("aborted");
  err.name = "AbortError";
  throw err;
}
