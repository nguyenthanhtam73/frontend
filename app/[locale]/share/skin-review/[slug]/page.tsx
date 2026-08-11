import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { SkinReviewShareView } from "@/components/share/skin-review-share-view";
import {
  fetchPublicSkinReview,
  skinReviewShareUrl,
} from "@/lib/api/admin-skin-review";
import {
  absoluteSiteUploadUrl,
  DEFAULT_OG_IMAGE,
  pageLocaleMetadata,
  pageSocialMetadata,
  type OgImage,
} from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "skinReviewShare" });
  const path = `/share/skin-review/${slug}`;

  try {
    const data = await fetchPublicSkinReview(slug);
    const title = data.title?.trim() || t("ogTitle");
    const description =
      data.analysis.overview?.trim().slice(0, 160) || t("ogDescription");

    const images: OgImage[] = data.image_urls?.[0]
      ? [
          {
            // Same-origin /uploads → rewrite to API (not Railway host in og:image).
            url: absoluteSiteUploadUrl(data.image_urls[0]),
            width: 1200,
            height: 630,
            alt: title,
          },
        ]
      : [DEFAULT_OG_IMAGE];

    const meta = pageSocialMetadata({
      title: `${title} · DaDiary`,
      description,
      locale,
      path,
      images,
    });

    return {
      ...meta,
      openGraph: {
        ...meta.openGraph,
        // Document title keeps "· DaDiary"; OG title prefers the review title.
        title,
        url: skinReviewShareUrl(data.slug, locale),
      },
      twitter: {
        ...meta.twitter,
        title,
      },
    };
  } catch {
    // Page will 404 — avoid soft-404 indexing with generic social tags.
    return pageLocaleMetadata({
      title: t("ogTitle"),
      description: t("ogDescription"),
      locale,
      path,
      noIndex: true,
    });
  }
}

export default async function PublicSkinReviewSharePage({ params }: Props) {
  const { slug } = await params;
  try {
    const data = await fetchPublicSkinReview(slug);
    return <SkinReviewShareView data={data} />;
  } catch (err) {
    if (err instanceof Error && err.message === "not_found") {
      notFound();
    }
    notFound();
  }
}
