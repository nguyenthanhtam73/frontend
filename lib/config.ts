/**
 * Inbox for “I can’t sign in, please delete my account” mail.
 *
 * PENDING: the owner has not chosen the real address yet.
 * Set NEXT_PUBLIC_SUPPORT_EMAIL to replace this placeholder.
 */
export const SUPPORT_EMAIL_PLACEHOLDER = "pending-support-email@dadiary.vn";

export const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || SUPPORT_EMAIL_PLACEHOLDER;
