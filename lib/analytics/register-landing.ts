import { isValidAccountEmail, normalizeAccountEmail } from "@/lib/auth/email-format";
import { FUNNEL_EVENTS, trackFunnelEvent } from "@/lib/analytics/funnel";
import {
  capturePageAttribution,
  readPageFirstTouch,
  type AttributionTouch,
} from "@/lib/analytics/attribution";

/**
 * Client-side register blocks. `network` is the fetch throw, not a field check.
 * Payloads must stay limited to `error_type` — never the typed email or field text.
 */
export const REGISTER_CLIENT_ERROR_TYPES = [
  "password_short",
  "email_invalid",
  "email_empty",
  "network",
] as const;

export type RegisterClientErrorType = (typeof REGISTER_CLIENT_ERROR_TYPES)[number];

export type RegisterFieldBlock = Exclude<RegisterClientErrorType, "network">;

const PASSWORD_MIN_LEN = 8;

/**
 * First blocker, in the same order as the register form: email, then password.
 * `null` means the fields are allowed to submit.
 */
export function classifyRegisterClientBlock(
  email: string,
  password: string,
): RegisterFieldBlock | null {
  if (!normalizeAccountEmail(email)) return "email_empty";
  if (!isValidAccountEmail(email)) return "email_invalid";
  if (password.length < PASSWORD_MIN_LEN) return "password_short";
  return null;
}

/** utm_source and utm_campaign from first-touch. Other attribution stays off the event. */
export function registerAttributionEventProps(): {
  utm_source?: string;
  utm_campaign?: string;
} {
  const touch = readPageFirstTouch();
  if (!touch) return {};
  const props: { utm_source?: string; utm_campaign?: string } = {};
  if (touch.utm_source) props.utm_source = touch.utm_source;
  if (touch.utm_campaign) props.utm_campaign = touch.utm_campaign;
  return props;
}

function trackRegister(
  name:
    | typeof FUNNEL_EVENTS.registerFormView
    | typeof FUNNEL_EVENTS.registerSubmitAttempt
    | typeof FUNNEL_EVENTS.registerClientError
    | typeof FUNNEL_EVENTS.registerEmailExists,
  extra?: { error_type: RegisterClientErrorType },
): void {
  capturePageAttribution();
  const props: Record<string, string> = { ...registerAttributionEventProps() };
  if (extra?.error_type) props.error_type = extra.error_type;
  trackFunnelEvent(name, props);
}

export function trackRegisterFormView(): void {
  trackRegister(FUNNEL_EVENTS.registerFormView);
}

export function trackRegisterSubmitAttempt(): void {
  trackRegister(FUNNEL_EVENTS.registerSubmitAttempt);
}

export function trackRegisterClientError(errorType: RegisterClientErrorType): void {
  trackRegister(FUNNEL_EVENTS.registerClientError, { error_type: errorType });
}

export function trackRegisterEmailExists(): void {
  trackRegister(FUNNEL_EVENTS.registerEmailExists);
}

/**
 * TODO(#53): delete this copy after rebasing onto main (#53, then #54, then #52).
 * Import `isRegisterEmailTakenResponse` from `@/lib/auth/register-email-taken` instead.
 * Same rule as that helper: a 409 is an email conflict unless `error.code` is `username_taken`.
 */
const EMAIL_TAKEN_EXCLUDED_CODES = new Set(["username_taken"]);

function readRegisterErrorCode(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const error = (body as { error?: { code?: unknown } }).error;
  return typeof error?.code === "string" ? error.code.trim().toLowerCase() : "";
}

export function isRegisterEmailTakenResponse(status: number, body: unknown): boolean {
  if (status !== 409) return false;
  return !EMAIL_TAKEN_EXCLUDED_CODES.has(readRegisterErrorCode(body));
}

/** Fire `register_email_exists` only for an email-conflict 409. */
export function trackRegisterEmailExistsForResponse(status: number, body: unknown): void {
  if (!isRegisterEmailTakenResponse(status, body)) return;
  trackRegisterEmailExists();
}

/** First-touch object for POST /auth/register. Null when nothing was stored. */
export function registerRequestAttribution(): AttributionTouch | null {
  capturePageAttribution();
  const touch = readPageFirstTouch();
  if (!touch) return null;
  return touch;
}

export const LANDING_CTA_BUTTONS = [
  "hero_primary",
  "header_register",
  "header_login",
  "bottom_cta",
] as const;

export type LandingCtaButton = (typeof LANDING_CTA_BUTTONS)[number];

/** Fire-and-forget. Does not prevent or await navigation. */
export function trackLandingCtaClick(button: LandingCtaButton): void {
  trackFunnelEvent(FUNNEL_EVENTS.landingCtaClick, { button });
}
