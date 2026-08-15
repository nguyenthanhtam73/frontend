"use client";

import {
  Check,
  ChevronDown,
  Copy,
  Download,
  ImageIcon,
  Loader2,
  Share2,
} from "lucide-react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";

import { SkinReviewAnalysisView } from "@/components/admin/skin-review-analysis-view";
import { LandingStartCta } from "@/components/landing/landing-start-cta";
import { SkinReviewQaBlock } from "@/components/share/skin-review-qa-block";
import { SkinReviewShareImageCard } from "@/components/share/skin-review-share-image-card";
import { Logo } from "@/components/site/logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "@/i18n/navigation";
import {
  absoluteUploadUrl,
  sameOriginUploadUrl,
} from "@/lib/api/admin-skin-review";
import {
  buildSkinReviewShareClipboard,
  DEFAULT_SHARE_VARIANT,
  shareVariantIncludesLink,
  normalizeShareVariant,
  type SkinReviewShareLocale,
  type SkinReviewShareVariant,
} from "@/lib/skin-review-share-clipboard";
import {
  canNativeShareFiles,
  downloadBlob,
  fetchImageAsDataUrl,
  nativeShareImageFile,
  renderShareImageBlob,
  shareImageFilename,
} from "@/lib/skin-review-share-image";
import { skinReviewTipsHeadingKey } from "@/lib/skin-review-tips-heading";
import type { PublicSkinReviewResponse } from "@/lib/types/admin-skin-review";
import { cn } from "@/lib/utils";

const REGION_KEYS = new Set([
  "forehead",
  "cheeks",
  "nose",
  "chin",
  "neck",
  "t_zone",
  "jawline",
  "under_eyes",
  "other",
]);
const CONCERN_KEYS = new Set([
  "none",
  "not_visible",
  "acne",
  "papules",
  "pustules",
  "redness",
  "pigmentation",
  "dark_spots",
  "pores",
  "dryness",
  "oiliness",
  "texture",
  "irritation",
  "other",
]);
const SEVERITY_KEYS = new Set(["mild", "moderate", "pronounced", "clear"]);
const SKIN_TYPE_KEYS = new Set([
  "oily",
  "dry",
  "combination",
  "normal",
  "sensitive",
  "unclear",
]);

/** Public Facebook-shareable skin review — teal/blush, mobile-first. */
export function SkinReviewShareView({ data }: { data: PublicSkinReviewResponse }) {
  const t = useTranslations("skinReviewShare");
  const tAdmin = useTranslations("adminSkinReview");
  const localeRaw = useLocale();
  const locale: SkinReviewShareLocale = localeRaw === "en" ? "en" : "vi";
  const formatter = useFormatter();
  const toast = useToast();
  const photos = data.image_urls ?? [];
  const hero = photos[0];
  const side = photos.slice(1);
  const multi = photos.length > 1;

  const imageCardRef = useRef<HTMLDivElement>(null);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [canShareImageFiles, setCanShareImageFiles] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showCopyOptions, setShowCopyOptions] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [exportPhotoSrc, setExportPhotoSrc] = useState<string | null>(null);

  useEffect(() => {
    setCanNativeShare(
      typeof navigator !== "undefined" && typeof navigator.share === "function",
    );
    setCanShareImageFiles(canNativeShareFiles());
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
        analysis: data.analysis,
        overview: data.analysis?.overview ?? "",
        answer: data.answer,
        link: url,
        skinType: data.analysis?.skin_type,
        skinTypeSeverity: data.analysis?.skin_type_severity,
        locale,
        variant,
      }),
    [data.analysis, data.answer, locale],
  );

  const copyShareText = useCallback(
    async (variant: SkinReviewShareVariant = DEFAULT_SHARE_VARIANT) => {
      const url = pageUrl();
      if (!url) return;
      const text = buildClipboardText(variant, url);
      const resolved = normalizeShareVariant(variant);
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        const toastKey =
          resolved === "link"
            ? "copyLinkOnlySuccess"
            : shareVariantIncludesLink(resolved)
              ? "copySuccessWithLink"
              : "copySuccess";
        toast.success(t(toastKey));
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
    // Text without URL — native share passes `url` separately.
    const text = buildClipboardText("short_no_link", url);
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

  const labelEnum = useCallback(
    (
      prefix: "skinTypes" | "severities" | "concerns" | "regions",
      raw: string | undefined,
      allowed: Set<string>,
    ) => {
      const key = raw?.trim().toLowerCase() ?? "";
      if (!key) return "";
      if (!allowed.has(key)) return raw?.trim() || "";
      return tAdmin(`${prefix}.${key}` as Parameters<typeof tAdmin>[0]);
    },
    [tAdmin],
  );

  // Full analysis copy — same fields as SkinReviewAnalysisView on the web page.
  const imageOverview = (data.analysis?.overview ?? "").trim();

  const imageSkinTypeLabel = useMemo(
    () => labelEnum("skinTypes", data.analysis?.skin_type, SKIN_TYPE_KEYS),
    [data.analysis?.skin_type, labelEnum],
  );

  const imageSkinTypeSeverity = useMemo(
    () =>
      labelEnum(
        "severities",
        data.analysis?.skin_type_severity,
        SEVERITY_KEYS,
      ),
    [data.analysis?.skin_type_severity, labelEnum],
  );

  const imageSkinTypeNote = (data.analysis?.skin_type_note ?? "").trim();

  const imageAttentionItems = useMemo(() => {
    const areas = data.analysis?.attention_areas ?? [];
    return areas
      .map((area) => {
        const region = labelEnum("regions", area.region, REGION_KEYS);
        const concern = labelEnum("concerns", area.concern, CONCERN_KEYS);
        const severity = labelEnum("severities", area.severity, SEVERITY_KEYS);
        if (!region && !concern) return null;
        return {
          region: region || "—",
          concern,
          severity,
          note: area.note?.trim() || undefined,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item != null);
  }, [data.analysis?.attention_areas, labelEnum]);

  const imageAdditional = (
    data.analysis?.additional_observations ?? ""
  ).trim();
  const imagePhotoNotes = (data.analysis?.photo_notes ?? "").trim();
  const imagePossibleCauses = (data.analysis?.possible_causes ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2);
  const imageSoothingTips = (data.analysis?.soothing_tips ?? [])
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
  const imageDisclaimer =
    data.analysis?.non_diagnostic?.trim() || t("imageDisclaimer");

  const ensureExportPhoto = useCallback(async () => {
    if (exportPhotoSrc) return exportPhotoSrc;
    if (!hero) return null;
    // Same-origin rewrite (/uploads → API) avoids cross-origin CORS for canvas.
    const dataUrl = await fetchImageAsDataUrl(sameOriginUploadUrl(hero));
    // Commit data-URL before capture so html-to-image never hits a tainted canvas.
    flushSync(() => {
      setExportPhotoSrc(dataUrl);
    });
    return dataUrl;
  }, [exportPhotoSrc, hero]);

  const generateShareImage = useCallback(async () => {
    const node = imageCardRef.current;
    if (!node) throw new Error("image_card_missing");
    await ensureExportPhoto();
    return renderShareImageBlob(node);
  }, [ensureExportPhoto]);

  const downloadShareImage = useCallback(async () => {
    if (imageBusy) return;
    setImageBusy(true);
    try {
      const blob = await generateShareImage();
      downloadBlob(blob, shareImageFilename(data.slug));
      toast.success(t("imageDownloadSuccess"));
    } catch {
      toast.error(t("imageError"));
    } finally {
      setImageBusy(false);
    }
  }, [data.slug, generateShareImage, imageBusy, t, toast]);

  const shareShareImage = useCallback(async () => {
    if (imageBusy) return;
    setImageBusy(true);
    try {
      const blob = await generateShareImage();
      const filename = shareImageFilename(data.slug);
      const title = data.title?.trim() || t("title");
      const result = await nativeShareImageFile(blob, filename, title);
      if (result === "shared") {
        toast.success(t("imageShareSuccess"));
        return;
      }
      if (result === "aborted") return;
      // Fallback when files share is unavailable.
      downloadBlob(blob, filename);
      toast.success(t("imageDownloadSuccess"));
    } catch {
      toast.error(t("imageError"));
    } finally {
      setImageBusy(false);
    }
  }, [
    data.slug,
    data.title,
    generateShareImage,
    imageBusy,
    t,
    toast,
  ]);

  function photoAlt(index: number) {
    return multi ? t("photoAltN", { n: index + 1 }) : t("photoAlt");
  }

  return (
    <div className="relative isolate overflow-x-hidden">
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
                "grid grid-cols-1 gap-1.5 bg-muted p-1.5",
                side.length > 0 && "sm:grid-cols-[1.4fr_1fr]",
              )}
            >
              <SharePhoto
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
                      <SharePhoto
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

          <div className="space-y-4 border-t border-border/60 px-4 py-5 sm:px-7 sm:py-8">
            <SkinReviewQaBlock
              questionLabel={t("fieldUserQuestion")}
              answerLabel={t("fieldAnswer")}
              userQuestion={data.user_question}
              answer={data.answer}
              variant="share"
            />
            <div className="space-y-1">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary sm:mb-5 sm:tracking-[0.2em]">
                {t("analysisLabel")}
              </p>
              <SkinReviewAnalysisView
                analysis={data.analysis}
                userQuestion={data.user_question}
                variant="share"
              />
            </div>
          </div>

          {/* Share actions — thumb-friendly, full-width on narrow screens */}
          <div className="space-y-2.5 border-t border-border/60 px-4 py-4 sm:px-7">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-11 w-full min-h-11 touch-manipulation sm:w-auto sm:min-w-[14rem]"
                onClick={() => void copyShareText("short_no_link")}
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

            {/* Image share — when FB groups block plain links */}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-2">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="h-11 w-full min-h-11 touch-manipulation sm:w-auto sm:min-w-[12rem]"
                disabled={imageBusy}
                onClick={() => void downloadShareImage()}
                aria-label={t("downloadImageCta")}
                aria-busy={imageBusy}
              >
                {imageBusy ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Download className="size-4" aria-hidden />
                )}
                {imageBusy ? t("imageGenerating") : t("downloadImageCta")}
              </Button>
              {canShareImageFiles ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="lg"
                  className="h-11 w-full min-h-11 touch-manipulation sm:w-auto sm:min-w-[10rem]"
                  disabled={imageBusy}
                  onClick={() => void shareShareImage()}
                  aria-label={t("shareImageCta")}
                  aria-busy={imageBusy}
                >
                  {imageBusy ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <ImageIcon className="size-4" aria-hidden />
                  )}
                  {imageBusy ? t("imageGenerating") : t("shareImageCta")}
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
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:justify-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-10 min-h-10 touch-manipulation"
                    onClick={() => void copyShareText("short_with_link")}
                  >
                    {t("copyCommentWithLinkCta")}
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-10 min-h-10 touch-manipulation"
                    onClick={() => void copyShareText("full_no_link")}
                  >
                    {t("copyFullNoLinkCta")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-10 min-h-10 touch-manipulation"
                    onClick={() => void copyShareText("full_with_link")}
                  >
                    {t("copyFullWithLinkCta")}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </article>

        {/* Off-screen 1080×auto export card (aria-hidden; never shows originals). */}
        <div
          aria-hidden
          className="pointer-events-none fixed top-0 left-[-10000px] z-[-1] overflow-hidden"
        >
          <SkinReviewShareImageCard
            ref={imageCardRef}
            brandMark={t("imageBrandMark")}
            title={data.title?.trim() || t("title")}
            analysisLabel={t("analysisLabel")}
            photoSrc={
              exportPhotoSrc ?? (hero ? sameOriginUploadUrl(hero) : null)
            }
            photoAlt={photoAlt(0)}
            userQuestionHeading={t("fieldUserQuestion")}
            userQuestion={(data.user_question ?? "").trim()}
            answerHeading={t("fieldAnswer")}
            answer={(data.answer ?? "").trim()}
            overviewHeading={tAdmin("fieldOverview")}
            overview={imageOverview || t("sub")}
            skinTypeHeading={tAdmin("fieldSkinType")}
            skinTypeLabel={imageSkinTypeLabel}
            skinTypeSeverity={imageSkinTypeSeverity}
            skinTypeNote={imageSkinTypeNote}
            attentionHeading={tAdmin("fieldAttention")}
            attentionItems={imageAttentionItems}
            additionalHeading={tAdmin("fieldAdditional")}
            additional={imageAdditional}
            photoNotesHeading={tAdmin("fieldPhotoNotes")}
            photoNotes={imagePhotoNotes}
            possibleCausesHeading={tAdmin("fieldPossibleCauses")}
            possibleCauses={imagePossibleCauses}
            soothingTipsHeading={tAdmin(
              skinReviewTipsHeadingKey(data.analysis, data.user_question),
            )}
            soothingTips={imageSoothingTips}
            disclaimer={imageDisclaimer}
            domain={t("imageDomain")}
          />
        </div>

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
            <LandingStartCta
              size="lg"
              className={cn(
                "h-11 min-h-11 w-full touch-manipulation sm:w-auto sm:min-w-[12rem]",
                "shadow-[0_10px_28px_-10px_color-mix(in_oklab,var(--primary)_55%,transparent)]",
              )}
            >
              {t("ctaRegister")}
            </LandingStartCta>
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

/** Full sharp photo so the owner can recognize their own check-in shot. */
function SharePhoto({
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
        className="absolute inset-0 size-full object-contain object-center"
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
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
