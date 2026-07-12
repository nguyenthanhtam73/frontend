"use client";

import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";

import { ButtonLink } from "@/components/ui/button-link";
import { Button } from "@/components/ui/button";

/** Route-level error boundary for everything under /[locale].
 *
 *  Next.js renders this (inside the persistent locale layout, so i18n + header
 *  are still available) whenever a child Server/Client Component throws during
 *  render. It keeps a runtime error from crashing the whole app to a blank page
 *  and gives the user a way out: `reset()` re-renders the segment, and we also
 *  offer a hard reload + a link home as fallbacks. */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errorBoundary");

  useEffect(() => {
    // Surface the error for debugging; a real logger could hook in here.
    console.error("[route error]", error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" aria-hidden />
      </span>
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">{t("title")}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("body")}</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button type="button" onClick={() => reset()}>
          {t("retry")}
        </Button>
        <Button type="button" variant="outline" onClick={() => window.location.reload()}>
          {t("reload")}
        </Button>
        <ButtonLink href="/" variant="ghost">
          {t("home")}
        </ButtonLink>
      </div>
    </div>
  );
}
