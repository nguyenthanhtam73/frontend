"use client";

import { useTranslations } from "next-intl";

import { LegalInlineLinks } from "@/components/legal/legal-links";
import { cn } from "@/lib/utils";

/** Honest, short privacy line next to face-photo capture. */
export function PhotoPrivacyNote({ className }: { className?: string }) {
  const t = useTranslations("privacy");
  return (
    <p
      data-testid="photo-privacy-note"
      className={cn("text-xs leading-relaxed text-muted-foreground", className)}
    >
      {t("uploadConsent")}{" "}
      <LegalInlineLinks />
    </p>
  );
}
