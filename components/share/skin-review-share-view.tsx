"use client";

import { useTranslations } from "next-intl";

import { SkinReviewAnalysisView } from "@/components/admin/skin-review-analysis-view";
import { Logo } from "@/components/site/logo";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { absoluteUploadUrl } from "@/lib/api/admin-skin-review";
import type { PublicSkinReviewResponse } from "@/lib/types/admin-skin-review";
import { cn } from "@/lib/utils";

/** Public Facebook-shareable skin review — teal/blush card layout. */
export function SkinReviewShareView({ data }: { data: PublicSkinReviewResponse }) {
  const t = useTranslations("skinReviewShare");
  const photos = data.image_urls ?? [];
  const hero = photos[0];
  const side = photos.slice(1);

  return (
    <div className="relative isolate overflow-hidden">
      {/* Teal + blush atmosphere */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[36rem] bg-[radial-gradient(ellipse_at_15%_0%,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_55%),radial-gradient(ellipse_at_90%_8%,color-mix(in_oklab,var(--accent)_70%,transparent),transparent_48%),linear-gradient(to_bottom,color-mix(in_oklab,var(--background)_30%,transparent),var(--background))]"
      />

      <div className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6 sm:py-14">
        <header className="mb-7 flex flex-col items-center gap-3 text-center">
          <Logo className="scale-110" />
          <div className="space-y-2">
            <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              {data.title?.trim() || t("title")}
            </h1>
            <p className="mx-auto max-w-md text-pretty text-sm text-muted-foreground sm:text-base">
              {t("sub")}
            </p>
          </div>
        </header>

        {/* Share card */}
        <article className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-card shadow-[0_24px_60px_-28px_color-mix(in_oklab,var(--primary)_35%,transparent)]">
          {hero ? (
            <div
              className={cn(
                "grid gap-1.5 bg-muted/40 p-1.5",
                side.length > 0 ? "sm:grid-cols-[1.4fr_1fr]" : "grid-cols-1",
              )}
            >
              <BlurPhoto
                src={absoluteUploadUrl(hero)}
                aspect={side.length > 0 ? "aspect-[4/5]" : "aspect-[4/3]"}
                priority
              />
              {side.length > 0 ? (
                <ul className="grid gap-1.5">
                  {side.map((url) => (
                    <li key={url} className="min-h-0">
                      <BlurPhoto
                        src={absoluteUploadUrl(url)}
                        aspect="aspect-[4/3] sm:aspect-auto sm:h-full"
                      />
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-1 border-t border-border/60 px-5 py-6 sm:px-7 sm:py-8">
            <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              {t("analysisLabel")}
            </p>
            <SkinReviewAnalysisView analysis={data.analysis} variant="share" />
          </div>
        </article>

        {/* CTA */}
        <section className="mt-8 overflow-hidden rounded-[1.75rem] border border-primary/20 bg-[linear-gradient(145deg,color-mix(in_oklab,var(--primary)_12%,var(--background)),color-mix(in_oklab,var(--accent)_55%,var(--background)))] px-6 py-8 text-center shadow-[0_16px_40px_-24px_color-mix(in_oklab,var(--primary)_40%,transparent)] sm:px-8">
          <p className="text-xl font-semibold tracking-tight sm:text-2xl">
            {t("ctaTitle")}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground sm:text-base">
            {t("ctaBody")}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
            <Link
              href="/register"
              className={cn(
                buttonVariants({ size: "lg" }),
                "min-w-[12rem] shadow-[0_10px_28px_-10px_color-mix(in_oklab,var(--primary)_55%,transparent)]",
              )}
            >
              {t("ctaRegister")}
            </Link>
            <Link
              href="/"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
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
  aspect,
  priority,
}: {
  src: string;
  aspect: string;
  priority?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.35rem] bg-muted",
        aspect,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="size-full object-cover blur-[2px] scale-[1.06]"
        loading={priority ? "eager" : "lazy"}
      />
      {/* Soft vignette so watermark stays readable */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,color-mix(in_oklab,var(--foreground)_18%,transparent)_100%)]"
      />
      {/* Logo watermark — corner, does not cover face center */}
      <div className="pointer-events-none absolute right-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-background/75 px-2 py-1 shadow-sm backdrop-blur-md ring-1 ring-border/50">
        <Logo showWord={false} className="[&_svg]:size-5" />
        <span className="pr-0.5 text-[10px] font-semibold tracking-tight text-foreground/90">
          Da<span className="text-primary">Diary</span>
        </span>
      </div>
    </div>
  );
}
