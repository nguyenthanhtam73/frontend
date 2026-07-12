"use client";

import { Info } from "lucide-react";
import { useTranslations } from "next-intl";

import { cn } from "@/lib/utils";

/** Shared, low-noise disclaimer shown near AI-generated skincare output.
 *
 *  Keep it subtle (small, muted) so it reassures without nagging. Use:
 *   - `variant="full"`  → the complete "reference only, see a dermatologist" note.
 *   - `variant="short"` → a one-liner for tight spots (cards, previews).
 *
 *  The copy lives in the `disclaimer` i18n namespace so both locales stay in sync. */
export function AiDisclaimer({
  variant = "full",
  className,
}: {
  variant?: "full" | "short";
  className?: string;
}) {
  const t = useTranslations("disclaimer");
  return (
    <p
      role="note"
      className={cn(
        "flex items-start gap-1.5 rounded-md bg-muted/40 px-2.5 py-1.5 text-[11px] leading-relaxed text-muted-foreground",
        className,
      )}
    >
      <Info className="mt-0.5 size-3 shrink-0" aria-hidden />
      <span>{variant === "short" ? t("aiShort") : t("ai")}</span>
    </p>
  );
}
