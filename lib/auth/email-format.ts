import type { ApiEnvelope } from "@/lib/api-envelope";

/**
 * Account email: trimmed, no spaces, a domain label, and a letter TLD.
 * Rejects `abc`, `abc@gmail`, and `abc@1995`. Accepts `ten@gmail.com`
 * and `a.b+tag@sub.domain.vn`.
 */
const ACCOUNT_EMAIL_RE = /^[^\s@]+@(?:[^\s@.]+\.)+[a-zA-Z]{2,}$/;

/** HTTP statuses treated as register validation failures. */
const REGISTER_EMAIL_VALIDATION_STATUSES = new Set([400, 422]);

/**
 * Known invalid-email codes. This list plus the 400/422 heuristic below is
 * the only place that maps a register API failure to the format message —
 * add the backend PR's exact code here when it lands.
 */
const REGISTER_INVALID_EMAIL_CODES = new Set([
  "invalid_email",
  "email_invalid",
  "invalid_email_format",
]);

/**
 * 400/422 bodies that mention "email" but mean "already registered", not a
 * bad format. Remove a phrase if a real format error uses it.
 */
const REGISTER_EMAIL_CONFLICT_HINTS = [
  "already",
  "exists",
  "taken",
  "duplicate",
  "registered",
  "in use",
  "conflict",
  "unique",
  "đã tồn tại",
  "đã đăng ký",
  "đã được",
  "đã có",
];

export function normalizeAccountEmail(value: string): string {
  return value.trim();
}

export function isValidAccountEmail(value: string): boolean {
  return ACCOUNT_EMAIL_RE.test(normalizeAccountEmail(value));
}

function readApiError(body: unknown): { code: string; message: string } {
  if (!body || typeof body !== "object") return { code: "", message: "" };
  const err = (body as ApiEnvelope).error;
  const code = typeof err?.code === "string" ? err.code.trim().toLowerCase() : "";
  const message = typeof err?.message === "string" ? err.message.trim().toLowerCase() : "";
  return { code, message };
}

/** True when a register response should show the invalid-email hint. */
export function isRegisterInvalidEmailResponse(status: number, body: unknown): boolean {
  if (status < 400 || status >= 500) return false;
  const { code, message } = readApiError(body);
  if (REGISTER_INVALID_EMAIL_CODES.has(code)) return true;
  if (!REGISTER_EMAIL_VALIDATION_STATUSES.has(status)) return false;
  const blob = `${code} ${message}`.trim();
  if (!blob.includes("email")) return false;
  if (REGISTER_EMAIL_CONFLICT_HINTS.some((hint) => blob.includes(hint))) return false;
  return true;
}
