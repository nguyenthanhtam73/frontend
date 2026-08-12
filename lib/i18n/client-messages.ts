import type { AbstractIntlMessages } from "next-intl";

/**
 * Namespaces required by chrome that lives in `[locale]/layout`
 * (header, footer toasts, PWA, auth CTAs, error boundary).
 * Kept tiny so marketing HTML stays lean; segment layouts merge extras.
 */
export const SHELL_MESSAGE_NAMESPACES = [
  "common",
  "netError",
  "pwa",
  "push",
  "iosInstall",
  "disclaimer",
  "errorBoundary",
  "auth",
  "premium",
  "feedback",
] as const;

/** Home client islands (beta form + progress preview cards). */
export const HOME_MESSAGE_NAMESPACES = ["betaSignup", "skinCard"] as const;

export const PRICING_MESSAGE_NAMESPACES = ["pricing", "payment"] as const;

export const SHARE_MESSAGE_NAMESPACES = ["skinReviewShare", "adminSkinReview"] as const;

export const PAYMENT_MESSAGE_NAMESPACES = ["payment", "pricing"] as const;

/**
 * Client namespaces used under `(app)/*` — pick explicitly so marketing/server-only
 * catalogs (hero, FAQ, metadata, …) never ship in authenticated HTML.
 *
 * When adding `useTranslations("…")` for an app client island, append the root
 * namespace here. Enforced by `lib/i18n/client-messages.test.ts` (`npm run test:i18n`).
 */
export const APP_CLIENT_MESSAGE_NAMESPACES = [
  "onboarding",
  "checkIn",
  "coachWelcome",
  "coachProductGuidance",
  "productSuggestions",
  "cabinet",
  "progress",
  "routine",
  "privacy",
  "meMemory",
  "appFeedback",
  "adminAffiliate",
  "adminFeedbacks",
  "adminPayments",
  "adminSkinReview",
  "adminUsers",
] as const;

/** Every namespace allowed in any client message pick list (shell + segments). */
export const ALL_CLIENT_MESSAGE_NAMESPACES = [
  ...SHELL_MESSAGE_NAMESPACES,
  ...HOME_MESSAGE_NAMESPACES,
  ...PRICING_MESSAGE_NAMESPACES,
  ...SHARE_MESSAGE_NAMESPACES,
  ...PAYMENT_MESSAGE_NAMESPACES,
  ...APP_CLIENT_MESSAGE_NAMESPACES,
] as const;

export function pickMessages(
  messages: AbstractIntlMessages,
  namespaces: readonly string[],
): AbstractIntlMessages {
  const next: AbstractIntlMessages = {};
  for (const ns of namespaces) {
    if (Object.prototype.hasOwnProperty.call(messages, ns)) {
      next[ns] = messages[ns]!;
    }
  }
  return next;
}
