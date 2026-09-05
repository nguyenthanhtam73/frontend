/**
 * Guest photo → starter routine → signup funnel events.
 * Meta Pixel is the live ads stack; custom names stay stable for Events Manager.
 */

import { trackMetaCustomEvent, trackMetaEvent } from "@/lib/meta-pixel";

export const FUNNEL_EVENTS = {
  photoAdded: "onboarding_photo_added",
  photosSubmitted: "onboarding_photos_submitted",
  routineShown: "onboarding_routine_shown",
  routineAccepted: "onboarding_routine_accepted",
  signupCtaClick: "onboarding_signup_cta_click",
  registerSuccess: "onboarding_register_success",
} as const;

export type FunnelEventName = (typeof FUNNEL_EVENTS)[keyof typeof FUNNEL_EVENTS];

export type FunnelEventPayload = {
  name: FunnelEventName;
  params?: Record<string, unknown>;
  ts: number;
};

declare global {
  interface Window {
    __dadiaryFunnel?: FunnelEventPayload[];
    dataLayer?: Record<string, unknown>[];
  }
}

const STANDARD_BY_CUSTOM: Partial<
  Record<FunnelEventName, { event: string; extra?: Record<string, unknown> }>
> = {
  [FUNNEL_EVENTS.photosSubmitted]: {
    event: "ViewContent",
    extra: { content_name: "onboarding_photos", content_category: "onboarding" },
  },
  [FUNNEL_EVENTS.routineShown]: {
    event: "ViewContent",
    extra: { content_name: "starter_routine", content_category: "onboarding" },
  },
  [FUNNEL_EVENTS.signupCtaClick]: {
    event: "Lead",
    extra: { content_name: "save_routine", content_category: "onboarding" },
  },
  // registerSuccess is custom-only — register page already fires CompleteRegistration.
};

function recordLocal(name: FunnelEventName, params?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  const entry: FunnelEventPayload = { name, params, ts: Date.now() };
  window.__dadiaryFunnel = window.__dadiaryFunnel ?? [];
  window.__dadiaryFunnel.push(entry);
  try {
    window.dataLayer = window.dataLayer ?? [];
    window.dataLayer.push({ event: name, ...params });
  } catch {
    /* ignore */
  }
}

const STANDARD_ONCE_PREFIX = "dadiary_funnel_std_";

function trackStandardOnce(
  event: string,
  params?: Record<string, unknown>,
): void {
  const key = `${STANDARD_ONCE_PREFIX}${event}:${String(params?.content_name ?? "")}`;
  try {
    if (sessionStorage.getItem(key) === "1") return;
    sessionStorage.setItem(key, "1");
  } catch {
    /* still fire — better a duplicate than a miss if storage is blocked */
  }
  trackMetaEvent(event, params);
}

/** Fire a funnel event (local queue + Meta custom + mapped standard event). */
export function trackFunnelEvent(
  name: FunnelEventName,
  params?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  recordLocal(name, params);
  trackMetaCustomEvent(name, params);
  if (params?.intent === "login") return;
  const mapped = STANDARD_BY_CUSTOM[name];
  if (mapped) {
    trackStandardOnce(mapped.event, { ...mapped.extra, ...params });
  }
}

export function isFunnelEventName(value: string): value is FunnelEventName {
  return (Object.values(FUNNEL_EVENTS) as string[]).includes(value);
}
