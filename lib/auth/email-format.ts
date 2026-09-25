import type { ApiEnvelope } from "@/lib/api-envelope";

/**
 * Same rule as register on the API (backend#18): trim, then require one
 * mailbox with a dotted domain and a letter TLD of at least 2 characters.
 * `abc@1995`, `abc@gmail`, `abc`, and `abc @gmail.com` fail.
 * `ten@gmail.com` and `a.b+tag@sub.domain.vn` pass. Mixed case is allowed;
 * the server lowercases before it stores the address.
 */
const LETTER_TLD = /^[a-z]{2,}$/;

/** HTTP statuses treated as register validation failures when the code is not exact. */
const REGISTER_EMAIL_VALIDATION_STATUSES = new Set([400, 422]);

/**
 * POST /auth/register returns 400 with this code for a bad address.
 * This file is the only place that maps that response to the inline hint.
 */
const INVALID_EMAIL_CODE = "invalid_email";

/**
 * 400/422 bodies that mention "email" but are not a format problem.
 * `invalid_input` is "email and password are required".
 */
const REGISTER_EMAIL_NOT_FORMAT_CODES = new Set([
  "invalid_input",
  "email_taken",
  "email_already_registered",
]);

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
  const email = normalizeAccountEmail(value).toLowerCase();
  if (email === "" || /[ \t\r\n]/.test(email)) return false;
  const at = email.indexOf("@");
  if (at <= 0 || at !== email.lastIndexOf("@") || at === email.length - 1) return false;
  const domain = email.slice(at + 1);
  const dot = domain.lastIndexOf(".");
  // TLD is the label after the last dot and must be at least two letters.
  if (dot <= 0 || dot >= domain.length - 2) return false;
  return LETTER_TLD.test(domain.slice(dot + 1));
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
  if (code === INVALID_EMAIL_CODE) return true;
  if (REGISTER_EMAIL_NOT_FORMAT_CODES.has(code)) return false;
  if (!REGISTER_EMAIL_VALIDATION_STATUSES.has(status)) return false;
  const blob = `${code} ${message}`.trim();
  if (!blob.includes("email")) return false;
  if (REGISTER_EMAIL_CONFLICT_HINTS.some((hint) => blob.includes(hint))) return false;
  return true;
}
