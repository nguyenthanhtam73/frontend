"use client";

import {
  Camera,
  ImagePlus,
  Loader2,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  CHECKIN_PHOTO_MAX_MB,
  validateCheckInPhoto,
  type PhotoValidationError,
} from "@/lib/check-in/photo-upload-validation";
import { compressOnboardingPhoto } from "@/lib/onboarding/compress-photo";
import { cn } from "@/lib/utils";

export type AdminReviewPhoto = { file: File; url: string };

/** Required minimum for analyze submit. */
export const MIN_ADMIN_SKIN_REVIEW_PHOTOS = 1;
/** Optional extra angles; analyze works with exactly 1. */
export const MAX_ADMIN_SKIN_REVIEW_PHOTOS = 3;

type Props = {
  photos: AdminReviewPhoto[];
  onChange: (photos: AdminReviewPhoto[]) => void;
  disabled?: boolean;
};

/**
 * Admin photo picker: 1 required, up to 3 optional, camera + album, no Premium gate.
 * Reuses check-in validation + onboarding compression.
 */
export function AdminSkinReviewUpload({ photos, onChange, disabled }: Props) {
  const t = useTranslations("adminSkinReview");
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);

  const errorMessage = useCallback(
    (code: PhotoValidationError) => {
      switch (code) {
        case "empty":
          return t("photoErrorEmpty");
        case "invalid_type":
          return t("photoErrorType");
        case "too_large":
          return t("photoErrorSize", { mb: CHECKIN_PHOTO_MAX_MB });
        default:
          return t("photoErrorGeneric");
      }
    },
    [t],
  );

  const addFiles = useCallback(
    async (list: FileList | null) => {
      if (!list || list.length === 0 || disabled) return;
      const remaining = MAX_ADMIN_SKIN_REVIEW_PHOTOS - photos.length;
      if (remaining <= 0) {
        setSlotError(t("photoErrorMax", { max: MAX_ADMIN_SKIN_REVIEW_PHOTOS }));
        return;
      }

      setBusy(true);
      setSlotError(null);
      const next = [...photos];
      try {
        for (const file of Array.from(list).slice(0, remaining)) {
          const code = validateCheckInPhoto(file);
          if (code) {
            setSlotError(errorMessage(code));
            continue;
          }
          const compressed = await compressOnboardingPhoto(file);
          next.push({
            file: compressed.file,
            url: URL.createObjectURL(compressed.file),
          });
        }
        onChange(next);
      } finally {
        setBusy(false);
        if (cameraRef.current) cameraRef.current.value = "";
        if (libraryRef.current) libraryRef.current.value = "";
      }
    },
    [disabled, errorMessage, onChange, photos, t],
  );

  const removeAt = useCallback(
    (index: number) => {
      const target = photos[index];
      if (target) URL.revokeObjectURL(target.url);
      onChange(photos.filter((_, i) => i !== index));
      setSlotError(null);
    },
    [onChange, photos],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={disabled || busy || photos.length >= MAX_ADMIN_SKIN_REVIEW_PHOTOS}
          onClick={() => cameraRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Camera className="size-4" />
          )}
          {t("captureCta")}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || busy || photos.length >= MAX_ADMIN_SKIN_REVIEW_PHOTOS}
          onClick={() => libraryRef.current?.click()}
        >
          <ImagePlus className="size-4" />
          {t("libraryCta")}
        </Button>
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={disabled || busy}
          onChange={(e) => void addFiles(e.target.files)}
        />
        <input
          ref={libraryRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.gif,.heic,.heif"
          multiple
          className="hidden"
          disabled={disabled || busy}
          onChange={(e) => void addFiles(e.target.files)}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {t("photoHint", { max: MAX_ADMIN_SKIN_REVIEW_PHOTOS })}
      </p>

      {slotError ? (
        <p className="text-sm text-destructive" role="alert">
          {slotError}
        </p>
      ) : null}

      {photos.length > 0 ? (
        <ul className="grid grid-cols-3 gap-3 sm:max-w-md">
          {photos.map((p, i) => (
            <li
              key={p.url}
              className={cn(
                "relative aspect-square overflow-hidden rounded-xl border border-border bg-muted",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={t("photoAlt", { n: i + 1 })}
                className="size-full object-cover"
              />
              <button
                type="button"
                className="absolute right-1.5 top-1.5 inline-flex size-8 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm"
                onClick={() => removeAt(i)}
                disabled={disabled || busy}
                aria-label={t("removePhoto")}
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
