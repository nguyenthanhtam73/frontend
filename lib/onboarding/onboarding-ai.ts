import { apiBaseUrl } from "@/lib/api";
import { ensureFreshAccessToken, getAccessToken } from "@/lib/auth-token";
import type { OnboardingSkinAnalyzeDTO } from "@/lib/types/onboarding-ai";

/** Friendly error kinds — never surface raw HTTP / stack traces in UI. */
export type OnboardingAiErrorKind =
  | "timeout"
  | "network"
  | "auth"
  | "server"
  | "unknown"
  | "photo_too_large"
  | "photo_invalid"
  | "photo_count"
  | "rate_limited"
  | "ai_unavailable";

export class OnboardingAiError extends Error {
  readonly kind: OnboardingAiErrorKind;

  constructor(kind: OnboardingAiErrorKind, message?: string) {
    super(message ?? kind);
    this.name = "OnboardingAiError";
    this.kind = kind;
  }
}

type JsonPayload = {
  success?: boolean;
  data?: unknown;
  error?: { message?: string; code?: string };
};

/** Fetch with abort timeout; maps failures to OnboardingAiError. */
export async function fetchOnboardingAi(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const fresh = await ensureFreshAccessToken(apiBaseUrl);
    const headers = new Headers(init.headers);
    const token = fresh || getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return await fetch(url, { ...init, headers, signal: controller.signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new OnboardingAiError("timeout");
    }
    if (err instanceof OnboardingAiError) throw err;
    throw new OnboardingAiError("network");
  } finally {
    clearTimeout(timer);
  }
}

export async function parseJsonSafe(res: Response): Promise<JsonPayload> {
  return (await res.json().catch(() => ({}))) as JsonPayload;
}

/**
 * Backend `error.code` → error kind. Anything absent here stays "server", so the
 * user sees the neutral retry copy rather than an internal message.
 */
const ERROR_CODE_KINDS: Record<string, OnboardingAiErrorKind> = {
  file_too_large: "photo_too_large",
  invalid_image: "photo_invalid",
  read_failed: "photo_invalid",
  invalid_multipart: "photo_invalid",
  too_few_images: "photo_count",
  too_many_images: "photo_count",
  rate_limited: "rate_limited",
  openai_not_configured: "ai_unavailable",
  service_unavailable: "ai_unavailable",
};

/** Status fallback when the body carried no recognizable code. */
function kindFromStatus(status: number): OnboardingAiErrorKind {
  if (status === 401 || status === 403) return "auth";
  if (status === 413) return "photo_too_large";
  if (status === 429) return "rate_limited";
  if (status === 503) return "ai_unavailable";
  return "server";
}

/** Resolve the friendly kind for a failed onboarding AI response. */
export function onboardingAiErrorKindFromResponse(
  res: Response,
  json: JsonPayload,
): OnboardingAiErrorKind {
  if (res.status === 401 || res.status === 403) return "auth";
  const code = json.error?.code?.trim();
  if (code && ERROR_CODE_KINDS[code]) return ERROR_CODE_KINDS[code];
  return kindFromStatus(res.status);
}

/** Map analyze-skin HTTP response → DTO or throw OnboardingAiError. */
export function assertAnalyzeSkinPayload(
  res: Response,
  json: JsonPayload,
): OnboardingSkinAnalyzeDTO {
  if (!res.ok || !json.data) {
    throw new OnboardingAiError(onboardingAiErrorKindFromResponse(res, json));
  }
  return json.data as OnboardingSkinAnalyzeDTO;
}

/** Map finish / preview-complete failures. */
export function assertOnboardingFinishPayload(
  res: Response,
  json: JsonPayload,
): void {
  if (!res.ok || json.success === false) {
    throw new OnboardingAiError(onboardingAiErrorKindFromResponse(res, json));
  }
}

export function onboardingAiErrorKind(err: unknown): OnboardingAiErrorKind {
  if (err instanceof OnboardingAiError) return err.kind;
  return "unknown";
}

/** i18n key under `onboarding.aiLoading.errors.*` */
export function onboardingAiErrorMessageKey(kind: OnboardingAiErrorKind): string {
  switch (kind) {
    case "timeout":
      return "errors.timeout";
    case "network":
      return "errors.network";
    case "auth":
      return "errors.auth";
    case "server":
      return "errors.server";
    case "photo_too_large":
      return "errors.photoTooLarge";
    case "photo_invalid":
      return "errors.photoInvalid";
    case "photo_count":
      return "errors.photoCount";
    case "rate_limited":
      return "errors.rateLimited";
    case "ai_unavailable":
      return "errors.aiUnavailable";
    default:
      return "errors.generic";
  }
}

/**
 * Kinds the user fixes by changing their photos — the panel then leads with
 * "pick another photo" instead of a bare retry that would fail the same way.
 */
export function isPhotoInputError(kind: OnboardingAiErrorKind): boolean {
  return kind === "photo_too_large" || kind === "photo_invalid" || kind === "photo_count";
}

/**
 * Server rejected a photo that is already staged, rather than complaining about
 * how many there are — the next pick has to replace the set, not extend it.
 */
export function isRejectedPhotoError(kind: OnboardingAiErrorKind): boolean {
  return kind === "photo_too_large" || kind === "photo_invalid";
}
