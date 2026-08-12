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

/** Everything except the shell — for authenticated trees merged on top of shell. */
export function omitMessages(
  messages: AbstractIntlMessages,
  namespaces: readonly string[],
): AbstractIntlMessages {
  const skip = new Set<string>(namespaces);
  const next: AbstractIntlMessages = {};
  for (const key of Object.keys(messages)) {
    if (!skip.has(key)) {
      next[key] = messages[key]!;
    }
  }
  return next;
}
