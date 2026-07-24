import { apiBaseUrl } from "@/lib/api";
import { type ApiEnvelope } from "@/lib/api-envelope";
import {
  authHeaders,
  clearAccessToken,
  ensureFreshAccessToken,
  getRefreshToken,
  refreshAccessToken,
} from "@/lib/auth-token";
import {
  getNetErrorCopy,
  pushToast,
  type NetErrorKind,
} from "@/lib/toast-bridge";

/** Centralized fetch wrapper for the Go backend.
 *
 *  Goals: one place for network failure handling, consistent toast messaging,
 *  and opt-in retries for transient errors — without rewriting the bespoke
 *  error UIs that some flows (check-in, routine suggest) already have.
 *
 *  Use `apiGet/apiPost/apiPut/apiPatch/apiDelete` (or `apiFetch` directly). By
 *  default the response envelope is unwrapped to `.data`; pass `raw: true` to
 *  get the full body. Failures throw an {@link ApiError}. */

/** Extra kind beyond network errors: a well-formed 4xx from the API. */
export type ApiErrorKind = NetErrorKind | "api";

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly code?: string;
  /** Raw server message (if any) — preferred over the localized fallback. */
  readonly serverMessage?: string;
  readonly payload?: unknown;

  constructor(
    kind: ApiErrorKind,
    opts: {
      status?: number | null;
      code?: string;
      serverMessage?: string;
      payload?: unknown;
      cause?: unknown;
    } = {},
  ) {
    super(opts.serverMessage || kind, { cause: opts.cause });
    this.name = "ApiError";
    this.kind = kind;
    this.status = opts.status ?? null;
    this.code = opts.code;
    this.serverMessage = opts.serverMessage;
    this.payload = opts.payload;
  }

  /** Best user-facing message: server message → localized copy → fallback. */
  userMessage(fallback?: string): string {
    const copyKind: NetErrorKind = this.kind === "api" ? "unknown" : this.kind;
    return (
      this.serverMessage ||
      getNetErrorCopy(copyKind) ||
      fallback ||
      "Something went wrong."
    );
  }
}

export type ApiRequestOptions = {
  method?: string;
  /** Auto JSON-stringified unless it's a string/FormData/URLSearchParams. */
  body?: unknown;
  headers?: Record<string, string>;
  /** Attach the bearer token when present. Default true. */
  auth?: boolean;
  /** Abort the request after N ms. Default 20000. Pass 0 to disable. */
  timeoutMs?: number;
  /** Extra attempts for transient errors (network/timeout/5xx). Default 0. */
  retries?: number;
  /** Base backoff between retries (grows linearly per attempt). Default 600ms. */
  retryDelayMs?: number;
  /** Caller cancellation — merged with the internal timeout controller. */
  signal?: AbortSignal;
  /** Show a toast on failure. Default true. Turn off when the caller renders
   *  its own error UI to avoid double messaging. */
  toastOnError?: boolean;
  /** Fallback toast/message when the server provides none. */
  fallbackMessage?: string;
  /** On 401, clear the (stale) token so the app drops to the guest state.
   *  Default true. */
  clearTokenOn401?: boolean;
  /** Return the full envelope instead of unwrapping `.data`. Default false. */
  raw?: boolean;
};

const DEFAULT_TIMEOUT_MS = 20_000;
const DEFAULT_RETRY_DELAY_MS = 600;

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isAbortError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name?: string }).name === "AbortError"
  );
}

function extractServerMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const err = (body as ApiEnvelope).error;
  const msg = typeof err?.message === "string" ? err.message.trim() : "";
  return msg || undefined;
}

function extractCode(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const code = (body as ApiEnvelope).error?.code;
  return typeof code === "string" && code.trim() ? code.trim() : undefined;
}

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${apiBaseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

/** True for errors worth retrying (transient / server-side). */
function isRetryable(kind: ApiErrorKind): boolean {
  return kind === "network" || kind === "timeout" || kind === "server";
}

/** A single attempt. Throws {@link ApiError} on any failure. */
async function requestOnce<T>(url: string, opts: ApiRequestOptions): Promise<T> {
  const {
    method = "GET",
    body,
    headers = {},
    auth = true,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    signal,
    clearTokenOn401 = true,
    raw = false,
  } = opts;

  // Proactively renew expired access before the request when possible.
  if (auth) {
    await ensureFreshAccessToken(apiBaseUrl);
  }

  const controller = new AbortController();
  let timedOut = false;
  const timer =
    timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, timeoutMs)
      : null;

  // Merge external cancellation into our controller.
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  const base = auth
    ? (authHeaders() as Record<string, string>)
    : { Accept: "application/json" };
  const finalHeaders: Record<string, string> = { ...base, ...headers };

  // Serialize plain-object bodies; leave FormData / strings untouched.
  let payload: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    if (
      typeof body === "string" ||
      body instanceof FormData ||
      body instanceof URLSearchParams ||
      body instanceof Blob
    ) {
      payload = body;
    } else {
      finalHeaders["Content-Type"] = finalHeaders["Content-Type"] || "application/json";
      payload = JSON.stringify(body);
    }
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: finalHeaders,
      body: payload,
      signal: controller.signal,
    });
  } catch (err) {
    if (timedOut) throw new ApiError("timeout", { cause: err });
    // External cancellation: let callers treat it as a normal abort (not toasted).
    if (isAbortError(err) && signal?.aborted) throw err;
    throw new ApiError("network", { cause: err });
  } finally {
    if (timer) clearTimeout(timer);
  }

  // Parse body (may be empty on 204 / DELETE).
  const text = await res.text().catch(() => "");
  let json: unknown = undefined;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      // Unparseable body: if the status is also an error, report by status,
      // otherwise it's a genuine parse error.
      if (res.status === 401) {
        throw new ApiError("unauthorized", { status: 401 });
      }
      if (res.status === 403) throw new ApiError("forbidden", { status: 403 });
      if (res.status === 429) throw new ApiError("rate_limited", { status: 429 });
      if (res.status >= 500) throw new ApiError("server", { status: res.status });
      if (!res.ok) throw new ApiError("api", { status: res.status });
      throw new ApiError("parse", { status: res.status });
    }
  }

  const serverMessage = extractServerMessage(json);
  const code = extractCode(json);

  if (res.status === 401) {
    throw new ApiError("unauthorized", {
      status: 401,
      code,
      serverMessage,
      payload: json,
    });
  }
  if (res.status === 403) {
    throw new ApiError("forbidden", { status: 403, code, serverMessage, payload: json });
  }
  if (res.status === 429 || code === "rate_limited") {
    throw new ApiError("rate_limited", {
      status: 429,
      code: code || "rate_limited",
      serverMessage,
      payload: json,
    });
  }
  if (res.status >= 500) {
    throw new ApiError("server", { status: res.status, code, serverMessage, payload: json });
  }
  if (!res.ok) {
    throw new ApiError("api", { status: res.status, code, serverMessage, payload: json });
  }

  if (raw) return json as T;
  const env = json as ApiEnvelope<T> | undefined;
  // Prefer the standard envelope's `.data`; fall back to the raw body for
  // endpoints that don't wrap their payload.
  return (env && "data" in env ? env.data : (json as T)) as T;
}

/**
 * Perform an API request with centralized error handling, optional retries,
 * timeout, and toast-on-failure. Throws {@link ApiError} on failure.
 */
export async function apiFetch<T = unknown>(
  path: string,
  opts: ApiRequestOptions = {},
): Promise<T> {
  const {
    retries = 0,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    toastOnError = true,
    fallbackMessage,
    signal,
  } = opts;

  const url = buildUrl(path);

  // Fast-path offline: skip the doomed fetch entirely.
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    const offline = new ApiError("offline");
    if (toastOnError) pushToast({ variant: "error", title: offline.userMessage(fallbackMessage) });
    throw offline;
  }

  let attempt = 0;
  let didRefreshRetry = false;
  for (;;) {
    try {
      return await requestOnce<T>(url, opts);
    } catch (err) {
      // Genuine caller cancellation — propagate quietly, never toast/retry.
      if (isAbortError(err) && signal?.aborted) throw err;

      const apiErr = err instanceof ApiError ? err : new ApiError("unknown", { cause: err });

      // One silent refresh+retry on 401 when we still have a refresh token.
      if (
        apiErr.kind === "unauthorized" &&
        opts.auth !== false &&
        !didRefreshRetry &&
        getRefreshToken() &&
        !signal?.aborted
      ) {
        didRefreshRetry = true;
        const ok = await refreshAccessToken(apiBaseUrl);
        if (ok) continue;
        if (opts.clearTokenOn401 !== false) clearAccessToken();
      } else if (apiErr.kind === "unauthorized" && opts.clearTokenOn401 !== false) {
        clearAccessToken();
      }

      if (isRetryable(apiErr.kind) && attempt < retries && !signal?.aborted) {
        attempt += 1;
        await delay(retryDelayMs * attempt);
        continue;
      }

      if (toastOnError) {
        pushToast({ variant: "error", title: apiErr.userMessage(fallbackMessage) });
      }
      throw apiErr;
    }
  }
}

type BodyOptions = Omit<ApiRequestOptions, "method" | "body">;
type NoBodyOptions = Omit<ApiRequestOptions, "method" | "body">;

export function apiGet<T = unknown>(path: string, opts: NoBodyOptions = {}): Promise<T> {
  return apiFetch<T>(path, { ...opts, method: "GET" });
}

export function apiPost<T = unknown>(
  path: string,
  body?: unknown,
  opts: BodyOptions = {},
): Promise<T> {
  return apiFetch<T>(path, { ...opts, method: "POST", body });
}

export function apiPut<T = unknown>(
  path: string,
  body?: unknown,
  opts: BodyOptions = {},
): Promise<T> {
  return apiFetch<T>(path, { ...opts, method: "PUT", body });
}

export function apiPatch<T = unknown>(
  path: string,
  body?: unknown,
  opts: BodyOptions = {},
): Promise<T> {
  return apiFetch<T>(path, { ...opts, method: "PATCH", body });
}

export function apiDelete<T = unknown>(path: string, opts: NoBodyOptions = {}): Promise<T> {
  return apiFetch<T>(path, { ...opts, method: "DELETE" });
}
