import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { SkinReviewShareView } from "@/components/share/skin-review-share-view";
import {
  absoluteUploadUrl,
  fetchPublicSkinReview,
  skinReviewShareUrl,
} from "@/lib/api/admin-skin-review";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "skinReviewShare" });

  try {
    const data = await fetchPublicSkinReview(slug);
    const title = data.title?.trim() || t("ogTitle");
    const description =
      data.analysis.overview?.trim().slice(0, 160) || t("ogDescription");
    const ogImage = data.image_urls?.[0]
      ? absoluteUploadUrl(data.image_urls[0])
      : undefined;
    const url = skinReviewShareUrl(data.slug, locale);

    return {
      title: `${title} · DaDiary`,
      description,
      openGraph: {
        title,
        description,
        url,
        siteName: "DaDiary",
        type: "website",
        locale: locale === "en" ? "en_US" : "vi_VN",
        images: ogImage
          ? [{ url: ogImage, width: 1200, height: 1200, alt: title }]
          : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: ogImage ? [ogImage] : undefined,
      },
    };
  } catch {
    return {
      title: t("ogTitle"),
      description: t("ogDescription"),
    };
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
