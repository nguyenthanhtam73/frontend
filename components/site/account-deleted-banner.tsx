"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";

/** Home notice after a successful account deletion (`?accountDeleted=1`). */
export function AccountDeletedBanner() {
  const params = useSearchParams();
  const t = useTranslations("common");
  if (params.get("accountDeleted") !== "1") return null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
      <p
        role="status"
        data-testid="account-deleted-notice"
        className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm leading-relaxed text-emerald-900 dark:text-emerald-100"
      >
        {t("accountDeleted")}
      </p>
    </div>
  );
}
