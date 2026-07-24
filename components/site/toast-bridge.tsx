"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { useToast } from "@/hooks/use-toast";
import { setNetErrorCopy, setToastHandler } from "@/lib/toast-bridge";

/** Wires the React toast system into the plain `lib/api-client.ts` module.
 *
 *  Renders nothing — it just registers the live toast dispatcher and the
 *  locale-aware fallback messages so non-React network code can raise toasts.
 *  Mount once inside <ToastProvider> (and inside NextIntlClientProvider). */
export function ToastBridge() {
  const { toast } = useToast();
  const t = useTranslations("netError");

  // Register / unregister the dispatcher (stable across renders).
  useEffect(() => {
    setToastHandler((opts) => toast(opts));
    return () => setToastHandler(null);
  }, [toast]);

  // Keep localized fallback copy in sync with the active locale.
  useEffect(() => {
    setNetErrorCopy({
      offline: t("offline"),
      network: t("network"),
      timeout: t("timeout"),
      unauthorized: t("unauthorized"),
      forbidden: t("forbidden"),
      rate_limited: t("rateLimited"),
      server: t("server"),
      parse: t("parse"),
      unknown: t("unknown"),
    });
  }, [t]);

  return null;
}
