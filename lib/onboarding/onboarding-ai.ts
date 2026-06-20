import type { OnboardingSkinAnalyzeDTO } from "@/lib/types/onboarding-ai";

/** Friendly error kinds — never surface raw HTTP / stack traces in UI. */
export type OnboardingAiErrorKind = "timeout" | "network" | "auth" | "server" | "unknown";

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
    return await fetch(url, { ...init, signal: controller.signal });
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

/** Map analyze-skin HTTP response → DTO or throw OnboardingAiError. */
export function assertAnalyzeSkinPayload(
  res: Response,
  json: JsonPayload,
): OnboardingSkinAnalyzeDTO {
  if (res.status === 401 || res.status === 403) {
    throw new OnboardingAiError("auth");
  }
  if (!res.ok || !json.data) {
    throw new OnboardingAiError("server");
  }
  return json.data as OnboardingSkinAnalyzeDTO;
}

/** Map finish / preview-complete failures. */
export function assertOnboardingFinishPayload(
  res: Response,
  json: JsonPayload,
): void {
  if (res.status === 401 || res.status === 403) {
    throw new OnboardingAiError("auth");
  }
  if (!res.ok || json.success === false) {
    throw new OnboardingAiError("server");
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
    default:
      return "errors.generic";
  }
}
