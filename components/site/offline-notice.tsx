"use client";

import { CloudOff } from "lucide-react";
import { useTranslations } from "next-intl";

import { useOnlineStatus } from "@/lib/use-online-status";
import { cn } from "@/lib/utils";

/**
 * In-flow contextual banner for pages that depend on the network (uploads,
 * AI feedback, etc.). Sits above the form so users understand *why* a submit
 * may fail before they tap it.
 *
 * Pass an optional `messageKey` to override the default copy with a more
 * page-specific warning (e.g. "Tải ảnh sẽ thất bại khi mất mạng…").
 */
export function OfflineNotice({
  className,
  messageKey,
}: {
  className?: string;
  /** Key inside the `pwa` namespace to use instead of the generic message. */
  messageKey?: string;
}) {
  const online = useOnlineStatus();
  const t = useTranslations("pwa");

  if (online) return null;

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50/80 p-3 text-sm text-amber-900 shadow-sm",
        "dark:border-amber-400/30 dark:bg-amber-950/40 dark:text-amber-100",
        className,
      )}
    >
      <CloudOff className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div className="space-y-0.5">
        <p className="font-semibold leading-tight">{t("offlineNoticeTitle")}</p>
        <p className="text-xs leading-snug opacity-90">
          {messageKey ? t(messageKey) : t("offlineNoticeBody")}
        </p>
      </div>
    </div>
  );
}
