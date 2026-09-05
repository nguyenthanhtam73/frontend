"use client";

import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const linkClass =
  "font-medium text-primary underline underline-offset-4 hover:text-primary/80";

/** Compact privacy + terms links for signup and photo-upload consent. */
export function LegalInlineLinks({ className }: { className?: string }) {
  const t = useTranslations("common.footer");
  return (
    <span className={cn("inline", className)}>
      <Link href="/privacy" className={linkClass}>
        {t("privacy")}
      </Link>
      <span aria-hidden className="px-1 text-muted-foreground">
        ·
      </span>
      <Link href="/terms" className={linkClass}>
        {t("terms")}
      </Link>
    </span>
  );
}
