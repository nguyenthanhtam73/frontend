"use client";

import { Check, ChevronDown, Copy, Share2 } from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { SkinReviewAnalysisView } from "@/components/admin/skin-review-analysis-view";
import { Logo } from "@/components/site/logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/i18n/navigation";
import { absoluteUploadUrl } from "@/lib/api/admin-skin-review";
import {
  buildSkinReviewShareClipboard,
  type SkinReviewShareLocale,
  type SkinReviewShareVariant,
} from "@/lib/skin-review-share-clipboard";
import type { PublicSkinReviewResponse } from "@/lib/types/admin-skin-review";
import { cn } from "@/lib/utils";

/** Public Facebook-shareable skin review — teal/blush, mobile-first. */
export function SkinReviewShareView({ data }: { data: PublicSkinReviewResponse }) {
  const t = useTranslations("skinReviewShare");
  const localeRaw = useLocale();
  const locale: SkinReviewShareLocale = localeRaw === "en" ? "en" : "vi";
  const formatter = useFormatter();
  const toast = useToast();
  const photos = data.image_urls ?? [];
  const hero = photos[0];
  const side = photos.slice(1);
  const multi = photos.length > 1;

  const [canNativeShare, setCanNativeShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCopyOptions, setShowCopyOptions] = useState(false);

  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
  }, []);

  const publishedLabel = data.published_at
    ? t("publishedLabel", {
        date: formatter.dateTime(new Date(data.published_at), {
          dateStyle: "medium",
        }),
      })
    : null;

  const pageUrl = useCallback(() => {
    if (typeof window === "undefined") return "";
    return window.location.href;
  }, []);

  const buildClipboardText = useCallback(
    (variant: SkinReviewShareVariant, url: string) =>
      buildSkinReviewShareClipboard({
        overview: data.analysis?.overview ?? "",
        link: url,
        skinType: data.analysis?.skin_type,
        skinTypeSeverity: data.analysis?.skin_type_severity,
        locale,
        variant,
      }),
    [
      data.analysis?.overview,
      data.analysis?.skin_type,
      data.analysis?.skin_type_severity,
      locale,
    ],
  );

  const copyShareText = useCallback(
    async (variant: SkinReviewShareVariant = "short") => {
      const url = pageUrl();
      if (!url) return;
      const text = buildClipboardText(variant, url);
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success(
          variant === "link" ? t("copyLinkOnlySuccess") : t("copySuccess"),
        );
        window.setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error(t("copyError"));
      }
    },
    [buildClipboardText, pageUrl, t, toast],
  );

  const nativeShare = useCallback(async () => {
    const url = pageUrl();
    if (!url || typeof navigator.share !== "function") return;
    const text = buildClipboardText("short", url);
    try {
      await navigator.share({
        title: data.title?.trim() || t("title"),
        text,
        url,
      });
      toast.success(t("shareSuccess"));
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error(t("shareError"));
    }
  }, [buildClipboardText, data.title, pageUrl, t, toast]);

  function photoAlt(index: number) {
    return multi ? t("photoAltN", { n: index + 1 }) : t("photoAlt");
  }

  return (
    <div className="relative isolate overflow-x-hidden">
      {/* Teal + blush atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[28rem] sm:h-[36rem] bg-[radial-gradient(ellipse_at_15%_0%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_55%),radial-gradient(ellipse_at_90%_8%,color-mix(in_oklab,var(--accent)_70%,transparent),transparent_48%),linear-gradient(to_bottom,color-mix(in_oklab,var(--background)_30%,transparent),var(--background))]"
      />

      <div
        className={cn(
          "mx-auto w-full max-w-xl",
          "pl-[max(1.125rem,env(safe-area-inset-left))] pr-[max(1.125rem,env(safe-area-inset-right))]",
          "pt-[max(1.75rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]",
          "sm:pl-6 sm:pr-6 sm:pt-14 sm:pb-14",
        )}
      >
        <header className="mb-6 flex flex-col items-center gap-2.5 text-center sm:mb-7 sm:gap-3">
          <Logo className="scale-105 sm:scale-110" />
          <div className="w-full max-w-md space-y-2 px-0.5">
            <h1 className="text-balance text-[1.625rem] font-semibold leading-snug tracking-tight sm:text-4xl sm:leading-tight">
              {data.title?.trim() || t("title")}
            </h1>
            <p className="text-pretty text-[0.9375rem] leading-relaxed text-muted-foreground sm:text-base">
              {t("sub")}
            </p>
            {publishedLabel ? (
              <p className="text-[0.8125rem] leading-snug text-muted-foreground/90">
                {publishedLabel}
              </p>
            ) : null}
          </div>
        </header>

        {/* Share card */}
        <article className="overflow-hidden rounded-[1.35rem] border border-border/80 bg-card shadow-[0_24px_60px_-28px_color-mix(in_oklab,var(--primary)_35%,transparent)] sm:rounded-[1.75rem]">
          {hero ? (
            <div
              className={cn(
                /* Mobile: vertical stack; desktop: side grid when 2–3 photos */
                "grid grid-cols-1 gap-1.5 bg-muted/40 p-1.5",
                side.length > 0 && "sm:grid-cols-[1.4fr_1fr]",
              )}
            >
              <BlurPhoto
                src={absoluteUploadUrl(hero)}
                alt={photoAlt(0)}
                aspect={
                  side.length > 0
                    ? "aspect-[4/5] sm:aspect-[4/5]"
                    : "aspect-[4/5] sm:aspect-[4/3]"
                }
                priority
              />
              {side.length > 0 ? (
                <ul
                  className={cn(
                    "grid grid-cols-1 gap-1.5",
                    side.length === 2 && "sm:grid-rows-2",
                  )}
                >
                  {side.map((url, i) => (
                    <li key={url} className="min-h-0 min-w-0">
                      <BlurPhoto
                        src={absoluteUploadUrl(url)}
                        alt={photoAlt(i + 1)}
                        aspect="aspect-[4/5] sm:aspect-[4/3] sm:h-full sm:min-h-0"
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-1 border-t border-border/60 px-4 py-5 sm:px-7 sm:py-8">
            <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary sm:mb-5 sm:tracking-[0.2em]">
              {t("analysisLabel")}
            </p>
            <SkinReviewAnalysisView analysis={data.analysis} variant="share" />
          </div>

          {/* Share actions — thumb-friendly, full-width on narrow screens */}
          <div className="space-y-2.5 border-t border-border/60 px-4 py-4 sm:px-7">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 w-full min-h-11 touch-manipulation sm:w-auto sm:min-w-[14rem]"
                onClick={() => void copyShareText("short")}
                aria-label={t("copyCommentCta")}
              >
                {copied ? (
                  <Check className="size-4" aria-hidden />
                ) : (
                  <Copy className="size-4" aria-hidden />
                )}
                {copied ? t("copied") : t("copyCommentCta")}
              </Button>
              {canNativeShare ? (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="h-11 w-full min-h-11 touch-manipulation sm:w-auto sm:min-w-[8rem]"
                  onClick={() => void nativeShare()}
                  aria-label={t("shareCta")}
                >
                  <Share2 className="size-4" aria-hidden />
                  {t("shareCta")}
                </Button>
              ) : null}
            </div>

            <div className="flex flex-col items-stretch gap-2 sm:items-center">
              <button
                type="button"
                className="inline-flex h-9 min-h-9 touch-manipulation items-center justify-center gap-1 self-center text-[0.8125rem] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                aria-expanded={showCopyOptions}
                onClick={() => setShowCopyOptions((v) => !v)}
              >
                {t("copyOptionsToggle")}
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform",
                    showCopyOptions && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>
              {showCopyOptions ? (
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-10 min-h-10 touch-manipulation"
                    onClick={() => void copyShareText("full")}
                  >
                    {t("copyFullCta")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-10 min-h-10 touch-manipulation"
                    onClick={() => void copyShareText("link")}
                  >
                    {t("copyLinkOnlyCta")}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </article>

        {/* CTA — large, end of page + safe-area (no sticky overlay) */}
        <section
          className={cn(
            "mt-6 overflow-hidden rounded-[1.35rem] border border-primary/20 sm:mt-8 sm:rounded-[1.75rem]",
            "bg-[linear-gradient(145deg,color-mix(in_oklab,var(--primary)_12%,var(--background)),color-mix(in_oklab,var(--accent)_55%,var(--background)))]",
            "px-5 py-7 text-center sm:px-8 sm:py-8",
            "shadow-[0_16px_40px_-24px_color-mix(in_oklab,var(--primary)_40%,transparent)]",
          )}
        >
          <p className="text-balance text-xl font-semibold leading-snug tracking-tight sm:text-2xl">
            {t("ctaTitle")}
          </p>
          <p className="mx-auto mt-2 max-w-md text-pretty text-[0.9375rem] leading-relaxed text-muted-foreground sm:text-base">
            {t("ctaBody")}
          </p>
          <div className="mt-5 flex flex-col gap-2.5 sm:mt-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
            <Link
              href="/register"
              className={cn(
                buttonVariants({ size: "lg" }),
                "h-11 min-h-11 w-full touch-manipulation sm:w-auto sm:min-w-[12rem]",
                "shadow-[0_10px_28px_-10px_color-mix(in_oklab,var(--primary)_55%,transparent)]",
              )}
            >
              {t("ctaRegister")}
            </Link>
            <Link
              href="/"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-11 min-h-11 w-full touch-manipulation sm:w-auto sm:min-w-[10rem]",
              )}
            >
              {t("ctaHome")}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function BlurPhoto({
  src,
  alt,
  aspect,
  priority,
}: {
  src: string;
  alt: string;
  aspect: string;
  priority?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-[1.1rem] bg-muted sm:rounded-[1.35rem]",
        aspect,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 size-full object-cover object-center blur-[2px] scale-[1.04]"
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
      />
      {/* Soft vignette — edges only, face center stays clear of overlays */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,color-mix(in_oklab,var(--foreground)_14%,transparent)_100%)]"
      />
      {/* Watermark — top-right corner only */}
      <div className="pointer-events-none absolute right-2 top-2 flex max-w-[42%] items-center gap-1 rounded-full bg-background/75 px-1.5 py-0.5 backdrop-blur-md ring-1 ring-border/50 sm:right-2.5 sm:top-2.5 sm:gap-1.5 sm:px-2 sm:py-1">
        <Logo showWord={false} className="[&_svg]:size-4 sm:[&_svg]:size-5" />
        <span className="truncate pr-0.5 text-[9px] font-semibold tracking-tight text-foreground/90 sm:text-[10px]">
          Da<span className="text-primary">Diary</span>
        </span>
      </div>
    </div>
  );
}
