/** Standard Go API JSON envelopes (`pkg/response`). */

export type ApiEnvelope<T = unknown> = {
  success?: boolean;
  data?: T;
  error?: { code?: string; message?: string };
};

/** Prefer server `error.message` (and `code`) so login/register show real causes (DB down, bad credentials, etc.). */
export function getApiErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const err = (body as ApiEnvelope).error;
  const msg = typeof err?.message === "string" ? err.message.trim() : "";
  const code = typeof err?.code === "string" ? err.code.trim() : "";
  if (msg && code) return `${msg} (${code})`;
  if (msg) return msg;
  return fallback;
}
