/**
 * Activation + conversion funnel events.
 *
 * Stack: Meta Pixel (prod only) + `window.dataLayer` + `window.__dadiaryFunnel`.
 * No second analytics vendor — `track()` / `trackFunnelEvent()` no-op on SSR
 * and Pixel itself no-ops in local/dev (`shouldLoadMetaPixel`).
 *
 * Naming: snake_case custom events, prefixed by surface.
 *
 * | Brief / ads name   | Event we fire                                      |
 * |--------------------|----------------------------------------------------|
 * | guest_photo        | onboarding_photo_added / onboarding_photos_submitted |
 * | routine_shown      | onboarding_routine_shown                           |
 * | signup_success     | onboarding_register_success                        |
 * | first_checkin      | activation_first_checkin                           |
 * | d1_checkin         | activation_d1_checkin (+ d1 reminder shown)        |
 * | push_opt_in        | activation_push_opt_in                             |
 * | push_dismissed     | activation_push_dismissed                          |
 * | paywall_view       | paywall_view                                       |
 * | checkout_confirm   | checkout_confirm                                   |
 * | paid               | paid (+ Meta Purchase via trackMetaPurchaseOnce)   |
 */

import { trackMetaCustomEvent, trackMetaEvent, trackMetaPurchaseOnce } from "@/lib/meta-pixel";

export const FUNNEL_EVENTS = {
  photoAdded: "onboarding_photo_added",
  photosSubmitted: "onboarding_photos_submitted",
  routineShown: "onboarding_routine_shown",
  routineAccepted: "onboarding_routine_accepted",
  signupCtaClick: "onboarding_signup_cta_click",
  registerSuccess: "onboarding_register_success",
  firstCheckInCtaClick: "activation_first_checkin_cta_click",
  firstCheckIn: "activation_first_checkin",
  d1CheckIn: "activation_d1_checkin",
  d1ReminderShown: "activation_d1_reminder_shown",
  pushOptIn: "activation_push_opt_in",
  pushDismissed: "activation_push_dismissed",
  paywallView: "paywall_view",
  checkoutConfirm: "checkout_confirm",
  paid: "paid",
} as const;

export type FunnelEventName = (typeof FUNNEL_EVENTS)[keyof typeof FUNNEL_EVENTS];

export type FunnelEventPayload = {
  name: FunnelEventName;
  params?: Record<string, unknown>;
  ts: number;
};

export type CheckInFunnelKind = "first" | "d1";

export type PaywallSurface = "upsell_banner" | "pricing";

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
  [FUNNEL_EVENTS.paywallView]: {
    event: "ViewContent",
    extra: { content_name: "paywall", content_category: "pricing" },
  },
  // registerSuccess is custom-only — register page already fires CompleteRegistration.
  // checkoutConfirm is custom-only — SePay start already fires InitiateCheckout.
  // paid is custom-only — trackPaidOnce also fires Meta Purchase once.
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
const CUSTOM_ONCE_PREFIX = "dadiary_funnel_once_";

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

/**
 * Thin typed alias. Safe on SSR (no-op). Pixel stays off in local/dev.
 */
export const track = trackFunnelEvent;

export function isFunnelEventName(value: string): value is FunnelEventName {
  return (Object.values(FUNNEL_EVENTS) as string[]).includes(value);
}

/** Session key for once-per-tab custom events. */
export function funnelOnceKey(name: FunnelEventName, scope = ""): string {
  const suffix = scope.trim() ? `:${scope.trim()}` : "";
  return `${CUSTOM_ONCE_PREFIX}${name}${suffix}`;
}

type OnceStore = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

/** Returns true the first time this key is seen; false on later calls. */
export function claimOnceFlag(store: OnceStore | null, key: string): boolean {
  if (!store) return true;
  try {
    if (store.getItem(key) === "1") return false;
    store.setItem(key, "1");
    return true;
  } catch {
    return true;
  }
}

function defaultSessionStore(): OnceStore | null {
  if (typeof sessionStorage === "undefined") return null;
  return sessionStorage;
}

/** Same as `track()`, but only the first time `name`+`scope` fires in this tab. */
export function trackFunnelEventOnce(
  name: FunnelEventName,
  params?: Record<string, unknown>,
  scope = "",
  store: OnceStore | null = defaultSessionStore(),
): boolean {
  if (!claimOnceFlag(store, funnelOnceKey(name, scope))) return false;
  trackFunnelEvent(name, params);
  return true;
}

function defaultLocalStore(): OnceStore | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage;
}

/** Once per user across tabs — uses localStorage keyed by `userId`. */
export function trackFunnelEventOncePerUser(
  name: FunnelEventName,
  userId: string,
  params?: Record<string, unknown>,
): boolean {
  const id = userId.trim();
  if (!id) return trackFunnelEventOnce(name, params, "anon", defaultLocalStore());
  return trackFunnelEventOnce(name, params, id, defaultLocalStore());
}

/**
 * Which completion events to fire after a successful check-in.
 * `first` = never checked in before. `d1` = day-1 return (reminder kind d1).
 * A first check-in on the calendar day after signup emits both.
 */
export function resolveCheckInFunnelKinds(input: {
  neverCheckedIn: boolean;
  reminderKind: "d0" | "d1" | "keep" | null;
}): CheckInFunnelKind[] {
  const kinds: CheckInFunnelKind[] = [];
  if (input.neverCheckedIn) kinds.push("first");
  if (input.reminderKind === "d1") kinds.push("d1");
  return kinds;
}

export function funnelEventForCheckInKind(
  kind: CheckInFunnelKind,
): FunnelEventName {
  return kind === "first" ? FUNNEL_EVENTS.firstCheckIn : FUNNEL_EVENTS.d1CheckIn;
}

export function paywallViewParams(input: {
  surface: PaywallSurface;
  feature?: string | null;
  recommendedPlan?: string | null;
}): Record<string, unknown> {
  const feature = (input.feature ?? "generic").trim() || "generic";
  const params: Record<string, unknown> = {
    surface: input.surface,
    feature,
  };
  if (input.recommendedPlan) params.recommended_plan = input.recommendedPlan;
  return params;
}

/** Custom `paid` + Meta Purchase, both once-per-invoice (Purchase helper dedupes). */
export function trackPaidOnce(opts?: { planConfirmed?: boolean }): void {
  trackFunnelEventOnce(
    FUNNEL_EVENTS.paid,
    { plan_confirmed: !!opts?.planConfirmed },
    "session",
  );
  trackMetaPurchaseOnce(opts);
}
