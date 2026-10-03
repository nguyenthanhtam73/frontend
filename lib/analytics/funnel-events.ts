import { funnelEventAttributionProps } from "@/lib/analytics/attribution";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";

/**
 * First-party funnel ingest. Parallel to Meta / TikTok (`lib/analytics/funnel.ts`).
 *
 * POST {API_BASE}/api/v1/funnel-events
 * Body: { event, session_id, path, props, client_ts }
 *
 * Fire-and-forget: keepalive fetch (sendBeacon when fetch is missing).
 * A missing endpoint (404) or any network error must not throw or block UI.
 * The normal bearer token is attached when the user is logged in.
 */

export const FIRST_PARTY_FUNNEL_EVENTS = {
  checkInPageView: "checkin_page_view",
  checkInFormView: "checkin_form_view",
  checkInPhotoStaged: "checkin_photo_staged",
  checkInSkipSelected: "checkin_skip_selected",
  checkInSubmitClicked: "checkin_submit_clicked",
  checkInSubmitSuccess: "checkin_submit_success",
  checkInSubmitError: "checkin_submit_error",
} as const;

export type FirstPartyFunnelEvent =
  (typeof FIRST_PARTY_FUNNEL_EVENTS)[keyof typeof FIRST_PARTY_FUNNEL_EVENTS];

/**
 * Shared check-in props, matching the Meta check-in events.
 * Optional first-touch `utm_source`, `utm_campaign`, `utm_content`, and
 * `fbclid` are merged in `sendFunnelEvent` and are not part of this context.
 */
export type CheckInFunnelContext = {
  never_checked_in: boolean;
  skip_mode: boolean;
  signed_in: boolean;
};

const SESSION_KEY = "dadiary:funnel_session_id";

export type FunnelEventBody = {
  event: string;
  session_id: string;
  path: string;
  props: Record<string, unknown>;
  /** ISO-8601 timestamp from the browser clock. */
  client_ts: string;
};

export function funnelEventsUrl(): string {
  const base = apiBaseUrl.replace(/\/$/, "");
  return `${base}/api/v1/funnel-events`;
}

/** Stable random id for this tab. Falls back if sessionStorage is blocked. */
export function getFunnelSessionId(): string {
  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return "ephemeral";
  }
}

export function buildFunnelEventBody(
  event: string,
  props: Record<string, unknown> = {},
): FunnelEventBody {
  return {
    event,
    session_id: getFunnelSessionId(),
    path: typeof window !== "undefined" ? window.location.pathname : "",
    props,
    client_ts: new Date().toISOString(),
  };
}

function authHeader(): Record<string, string> {
  try {
    const token = getAccessToken();
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

function propsWithFirstTouch(props: Record<string, unknown>): Record<string, unknown> {
  const attr = funnelEventAttributionProps();
  if (Object.keys(attr).length === 0) return props;
  return { ...attr, ...props };
}

/**
 * Keys `POST /api/v1/funnel-events` accepts for register and landing.
 * Any other key (utm_medium, ttclid, gclid, email, …) makes the backend
 * return 400 and the step is dropped. Check-in events are not in this map:
 * the DTO keeps their existing props and only sanitizes the four attribution keys.
 */
const REGISTER_ATTRIBUTION_PROP_KEYS = [
  "utm_source",
  "utm_campaign",
  "utm_content",
  "fbclid",
] as const;

const STRICT_FIRST_PARTY_PROP_KEYS: Record<string, readonly string[]> = {
  register_form_view: REGISTER_ATTRIBUTION_PROP_KEYS,
  register_submit_attempt: REGISTER_ATTRIBUTION_PROP_KEYS,
  register_email_exists: REGISTER_ATTRIBUTION_PROP_KEYS,
  register_client_error: ["error_type", ...REGISTER_ATTRIBUTION_PROP_KEYS],
  landing_cta_click: ["button", ...REGISTER_ATTRIBUTION_PROP_KEYS],
};

function propsForIngest(event: string, props: Record<string, unknown>): Record<string, unknown> {
  const merged = propsWithFirstTouch(props);
  const allowed = STRICT_FIRST_PARTY_PROP_KEYS[event];
  if (!allowed) return merged;
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (merged[key] === undefined) continue;
    out[key] = merged[key];
  }
  return out;
}

/**
 * POST one funnel event. Returns immediately. Never throws.
 * Ignores 404 and every other failure (the backend route may not be deployed yet).
 * Check-in posts pick up the same four optional first-touch keys as register.
 * Caller props win, so existing check-in keys are unchanged.
 * Register and landing posts are reduced to the backend allowlist before send.
 */
export function sendFunnelEvent(
  event: string,
  props: Record<string, unknown> = {},
): void {
  if (typeof window === "undefined") return;
  try {
    const body = JSON.stringify(buildFunnelEventBody(event, propsForIngest(event, props)));
    const url = funnelEventsUrl();
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...authHeader(),
    };

    if (typeof fetch === "function") {
      void fetch(url, {
        method: "POST",
        headers,
        body,
        keepalive: true,
        credentials: "omit",
      }).then(
        () => {},
        () => {},
      );
      return;
    }

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon(url, blob);
    }
  } catch {
    /* swallow — analytics must not break check-in */
  }
}
