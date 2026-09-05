"use client";

import { Images } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { BeforeAfterShareDialog } from "@/components/share/before-after-share-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth-token";
import {
  canSharePhotoPair,
  flattenProgressPhotos,
  mergeCheckInIntoEntries,
  type SharePhotoRef,
} from "@/lib/share/before-after";
import type { ProgressTimelineDTO } from "@/lib/types/progress";
import type { CreateSkinCheckResponseDTO } from "@/lib/types/skin-check";

/**
 * From check-in results: signed-in user can pick an earlier photo vs today's
 * and export a local before/after card (no public URL).
 */
export function CheckInBeforeAfterShare({
  payload,
}: {
  payload: CreateSkinCheckResponseDTO;
}) {
  const t = useTranslations("checkIn.beforeAfterShare");
  const [photos, setPhotos] = useState<SharePhotoRef[] | null>(null);
  const [open, setOpen] = useState(false);

  const ownUrls = payload.image_urls ?? [];

  useEffect(() => {
    if (ownUrls.length === 0) {
      setPhotos([]);
      return;
    }

    let cancelled = false;
    const headers: Record<string, string> = {};
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    void (async () => {
      try {
        const res = await fetch(`${apiBaseUrl}/api/v1/progress?range=90`, { headers });
        const raw = await res.json().catch(() => ({}));
        if (cancelled) return;
        const timeline = raw?.data as ProgressTimelineDTO | undefined;
        const entries = mergeCheckInIntoEntries(timeline?.entries ?? [], {
          id: payload.check.id,
          check_date: payload.check.check_date,
          created_at: payload.check.created_at,
          image_urls: payload.image_urls,
          title: payload.check.title,
        });
        setPhotos(flattenProgressPhotos(entries));
      } catch {
        if (!cancelled) {
          setPhotos(
            flattenProgressPhotos(
              mergeCheckInIntoEntries([], {
                id: payload.check.id,
                check_date: payload.check.check_date,
                created_at: payload.check.created_at,
                image_urls: payload.image_urls,
                title: payload.check.title,
              }),
            ),
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ownUrls.length, payload.check.check_date, payload.check.created_at, payload.check.id, payload.check.title, payload.image_urls]);

  const pair = useMemo(() => defaultPair(photos ?? [], payload.check.id), [photos, payload.check.id]);

  if (ownUrls.length === 0 || photos == null || photos.length < 2 || !pair) {
    return null;
  }

  return (
    <>
      <Card className="border-primary/20 bg-gradient-to-b from-primary/[0.05] to-transparent">
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-semibold tracking-tight">{t("title")}</p>
            <p className="text-xs leading-relaxed text-muted-foreground">{t("hint")}</p>
          </div>
          <Button type="button" variant="outline" className="min-h-11 shrink-0 gap-2" onClick={() => setOpen(true)}>
            <Images className="size-4" aria-hidden />
            {t("cta")}
          </Button>
        </CardContent>
      </Card>
      <BeforeAfterShareDialog
        open={open}
        onOpenChange={setOpen}
        photos={photos}
        initialBefore={pair.before}
        initialAfter={pair.after}
      />
    </>
  );
}

function defaultPair(
  photos: SharePhotoRef[],
  checkId: string,
): { before: SharePhotoRef; after: SharePhotoRef } | null {
  if (photos.length < 2) return null;
  const after =
    photos.find((p) => p.entryId === checkId) ?? photos[0]!;
  const before =
    [...photos].reverse().find((p) => canSharePhotoPair(p, after)) ??
    photos.find((p) => canSharePhotoPair(p, after));
  if (!before) return null;
  return { before, after };
}
