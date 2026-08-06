"use client";

import { cn } from "@/lib/utils";

type Props = {
  questionLabel: string;
  answerLabel: string;
  userQuestion?: string | null;
  answer?: string | null;
  className?: string;
  /** share = larger type for public page; default = admin console. */
  variant?: "default" | "share";
};

/** Public Q&A block — hidden when both question and answer are empty. */
export function SkinReviewQaBlock({
  questionLabel,
  answerLabel,
  userQuestion,
  answer,
  className,
  variant = "default",
}: Props) {
  const q = userQuestion?.trim() ?? "";
  const a = answer?.trim() ?? "";
  if (!q && !a) return null;

  const share = variant === "share";

  return (
    <section
      className={cn(
        "space-y-3 rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-4 sm:px-5 sm:py-5",
        className,
      )}
    >
      {q ? (
        <div className="space-y-1">
          <p
            className={cn(
              "font-semibold uppercase tracking-[0.14em] text-muted-foreground",
              share ? "text-[11px]" : "text-[10px]",
            )}
          >
            {questionLabel}
          </p>
          <p
            className={cn(
              "whitespace-pre-wrap text-muted-foreground",
              share
                ? "text-[0.9375rem] leading-relaxed sm:text-base"
                : "text-sm leading-relaxed",
            )}
          >
            {q}
          </p>
        </div>
      ) : null}
      {a ? (
        <div className="space-y-1">
          <p
            className={cn(
              "font-semibold uppercase tracking-[0.14em] text-primary",
              share ? "text-[11px]" : "text-[10px]",
            )}
          >
            {answerLabel}
          </p>
          <p
            className={cn(
              "whitespace-pre-wrap font-semibold text-foreground",
              share
                ? "text-lg leading-snug tracking-tight sm:text-xl sm:leading-snug"
                : "text-base leading-snug",
            )}
          >
            {a}
          </p>
        </div>
      ) : null}
    </section>
  );
}
