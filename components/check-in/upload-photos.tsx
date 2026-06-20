"use client";

import { useTranslations } from "next-intl";
import {
  AlertCircle,
  Camera,
  ImageIcon,
  ImagePlus,
  Lightbulb,
  RefreshCw,
  Trash2,
  User,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  CHECKIN_PHOTO_MAX_MB,
  validateCheckInPhoto,
  type PhotoValidationError,
} from "@/lib/check-in/photo-upload-validation";
import { cn } from "@/lib/utils";

export type UploadItem = { file: File; url: string };

export const MAX_CHECKIN_PHOTOS = 2;

type PhotoSlotIndex = 0 | 1;

export type PhotoSlots = [UploadItem | null, UploadItem | null];

export type SlotErrors = [string | null, string | null];

export function compactPhotoSlots(slots: PhotoSlots): UploadItem[] {
  const out: UploadItem[] = [];
  if (slots[0]) out.push(slots[0]);
  if (slots[1]) out.push(slots[1]);
  return out;
}

export function itemsToSlots(items: UploadItem[]): PhotoSlots {
  return [items[0] ?? null, items[1] ?? null];
}

function fileToItem(file: File): UploadItem {
  return { file, url: URL.createObjectURL(file) };
}

/** Two-slot photo upload: front face + slight angle. Mobile-first + desktop drag-drop. */
export function UploadPhotos({
  slots,
  onSlotsChange,
}: {
  slots: PhotoSlots;
  onSlotsChange: (slots: PhotoSlots) => void;
}) {
  const t = useTranslations("checkIn");
  const fileRefs = useRef<(HTMLInputElement | null)[]>([null, null]);
  const [slotErrors, setSlotErrors] = useState<SlotErrors>([null, null]);
  const filledCount = (slots[0] ? 1 : 0) + (slots[1] ? 1 : 0);

  const errorMessage = useCallback(
    (code: PhotoValidationError) => {
      switch (code) {
        case "empty":
          return t("photoErrorEmpty");
        case "invalid_type":
          return t("photoErrorInvalidTypeShort");
        case "too_large":
          return t("photoErrorTooLargeShort", { maxMb: CHECKIN_PHOTO_MAX_MB });
      }
    },
    [t],
  );

  const clearSlotError = useCallback((index: PhotoSlotIndex) => {
    setSlotErrors((prev) => {
      if (!prev[index]) return prev;
      const next: SlotErrors = [...prev];
      next[index] = null;
      return next;
    });
  }, []);

  const setSlotError = useCallback((index: PhotoSlotIndex, message: string) => {
    setSlotErrors((prev) => {
      const next: SlotErrors = [...prev];
      next[index] = message;
      return next;
    });
  }, []);

  const assignSlot = useCallback(
    (index: PhotoSlotIndex, item: UploadItem | null) => {
      const next: PhotoSlots = [...slots] as PhotoSlots;
      const prevItem = next[index];
      if (prevItem && prevItem !== item) {
        URL.revokeObjectURL(prevItem.url);
      }
      next[index] = item;
      onSlotsChange(next);
      if (item) clearSlotError(index);
    },
    [clearSlotError, onSlotsChange, slots],
  );

  /** Assign one or more files starting at `targetIndex` (replace target, then fill empties). */
  const ingestFilesAtSlot = useCallback(
    (targetIndex: PhotoSlotIndex, rawFiles: FileList | File[] | null | undefined) => {
      const files = rawFiles ? Array.from(rawFiles) : [];
      if (files.length === 0) return;

      const next: PhotoSlots = [...slots] as PhotoSlots;
      const errors: SlotErrors = [null, null];
      let fileCursor = 0;

      const tryAssign = (index: PhotoSlotIndex, file: File): boolean => {
        const code = validateCheckInPhoto(file);
        if (code) {
          errors[index] = errorMessage(code);
          return false;
        }
        const prev = next[index];
        if (prev) URL.revokeObjectURL(prev.url);
        next[index] = fileToItem(file);
        errors[index] = null;
        return true;
      };

      if (fileCursor < files.length) {
        tryAssign(targetIndex, files[fileCursor]!);
        fileCursor += 1;
      }

      for (const slotIdx of [0, 1] as const) {
        if (fileCursor >= files.length) break;
        if (next[slotIdx] !== null) continue;
        if (!tryAssign(slotIdx, files[fileCursor]!)) {
          fileCursor += 1;
          continue;
        }
        fileCursor += 1;
      }

      if (fileCursor < files.length && next[0] && next[1]) {
        errors[targetIndex] = t("photoDropTooMany");
      }

      setSlotErrors((prev) => {
        const merged: SlotErrors = [...prev];
        for (const idx of [0, 1] as const) {
          if (errors[idx] !== null) merged[idx] = errors[idx];
          else if (next[idx] && next[idx] !== slots[idx]) merged[idx] = null;
        }
        return merged;
      });
      onSlotsChange(next);
    },
    [errorMessage, onSlotsChange, slots, t],
  );

  const openPicker = useCallback(
    (index: PhotoSlotIndex, capture?: "user" | "environment") => {
      clearSlotError(index);
      const input = fileRefs.current[index];
      if (!input) return;
      if (capture) {
        input.setAttribute("capture", capture);
      } else {
        input.removeAttribute("capture");
      }
      input.click();
    },
    [clearSlotError],
  );

  return (
    <div className="space-y-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-2 motion-safe:duration-300">
      <div>
        <h2 className="text-base font-semibold tracking-tight">{t("photoTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("photoHint")}</p>
        <p className="mt-1 hidden text-xs text-muted-foreground sm:block">
          {t("photoDragHintDesktop")}
        </p>
      </div>

      {filledCount === 0 ? (
        <PhotoTipsCard
          title={t("photoTipsTitle")}
          tips={[t("photoTipLight"), t("photoTipAngle"), t("photoTipClean")]}
        />
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {([0, 1] as const).map((slotIndex) => (
          <PhotoSlotCard
            key={slotIndex}
            slotIndex={slotIndex}
            item={slots[slotIndex]}
            slotError={slotErrors[slotIndex]}
            label={slotIndex === 0 ? t("photoSlotFront") : t("photoSlotAngle")}
            addLabel={slotIndex === 0 ? t("photoAddFront") : t("photoAddAngle")}
            emptyHint={
              slotIndex === 0 ? t("photoEmptyFront") : t("photoEmptyAngle")
            }
            dragHint={t("photoDropHere")}
            replaceHint={t("photoReplaceHint")}
            retakeLabel={t("retakePhoto")}
            removeLabel={t("removePhoto")}
            retryLabel={t("photoRetrySlot")}
            cameraLabel={t("photoCapture")}
            albumLabel={t("photoLibrary")}
            onPickFront={() => openPicker(slotIndex, "user")}
            onPickLibrary={() => openPicker(slotIndex)}
            onRemove={() => assignSlot(slotIndex, null)}
            onRetake={() =>
              openPicker(slotIndex, slotIndex === 0 ? "user" : "environment")
            }
            onRetry={() => openPicker(slotIndex)}
            onFilesDrop={(files) => ingestFilesAtSlot(slotIndex, files)}
            fileInputRef={(el) => {
              fileRefs.current[slotIndex] = el;
            }}
            onFileChange={(files) => ingestFilesAtSlot(slotIndex, files)}
          />
        ))}
      </div>

      {filledCount > 0 ? (
        <p className="text-center text-xs text-muted-foreground">
          {t("photoCountLabel", { n: filledCount })}
          <span className="mx-1.5 text-border">·</span>
          {t("photoCountHint")}
        </p>
      ) : null}
    </div>
  );
}

function PhotoSlotCard({
  slotIndex,
  item,
  slotError,
  label,
  addLabel,
  emptyHint,
  dragHint,
  replaceHint,
  retakeLabel,
  removeLabel,
  retryLabel,
  cameraLabel,
  albumLabel,
  onPickFront,
  onPickLibrary,
  onRemove,
  onRetake,
  onRetry,
  onFilesDrop,
  fileInputRef,
  onFileChange,
}: {
  slotIndex: PhotoSlotIndex;
  item: UploadItem | null;
  slotError: string | null;
  label: string;
  addLabel: string;
  emptyHint: string;
  dragHint: string;
  replaceHint: string;
  retakeLabel: string;
  removeLabel: string;
  retryLabel: string;
  cameraLabel: string;
  albumLabel: string;
  onPickFront: () => void;
  onPickLibrary: () => void;
  onRemove: () => void;
  onRetake: () => void;
  onRetry: () => void;
  onFilesDrop: (files: FileList | null) => void;
  fileInputRef: (el: HTMLInputElement | null) => void;
  onFileChange: (files: FileList | null) => void;
}) {
  const isFront = slotIndex === 0;
  const [dragOver, setDragOver] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const dragDepth = useRef(0);
  const replaceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerReplaceFlash = useCallback(() => {
    if (replaceTimer.current) clearTimeout(replaceTimer.current);
    setReplacing(true);
    replaceTimer.current = setTimeout(() => {
      setReplacing(false);
      replaceTimer.current = null;
    }, 450);
  }, []);

  const dropHandlers = {
    onDragEnter: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragDepth.current += 1;
      setDragOver(true);
    },
    onDragLeave: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragDepth.current -= 1;
      if (dragDepth.current <= 0) {
        dragDepth.current = 0;
        setDragOver(false);
      }
    },
    onDragOver: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragDepth.current = 0;
      setDragOver(false);
      if (item) triggerReplaceFlash();
      onFilesDrop(e.dataTransfer.files);
    },
  };

  const dropRing = cn(
    "rounded-2xl transition-all duration-200",
    dragOver &&
      "ring-[3px] ring-primary ring-offset-2 ring-offset-background shadow-lg shadow-primary/10",
    slotError && !dragOver && "ring-2 ring-destructive/40",
    replacing && "ring-2 ring-primary/60 ring-offset-2 ring-offset-background",
  );

  const slotErrorBlock = slotError ? (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-2.5 py-2 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
    >
      <p className="flex items-start gap-1.5 text-xs leading-relaxed text-destructive">
        <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        {slotError}
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onRetry}
        className="min-h-10 gap-1.5 self-start border-destructive/30 text-xs text-destructive hover:bg-destructive/10"
      >
        <RefreshCw className="size-3.5" aria-hidden />
        {retryLabel}
      </Button>
    </div>
  ) : null;

  if (!item) {
    return (
      <div className="flex flex-col gap-2">
        <SlotLabel label={label} recommended={isFront} />
        <div {...dropHandlers} className={dropRing}>
          <button
            type="button"
            onClick={onPickLibrary}
            className={cn(
              "group flex min-h-[11rem] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-3 py-4 text-muted-foreground transition-all duration-200 sm:min-h-[12rem]",
              dragOver
                ? "scale-[1.02] border-primary border-solid bg-primary/15 text-foreground"
                : "border-border bg-muted/30 hover:border-primary/50 hover:bg-primary/5 hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "inline-flex size-11 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-border transition-transform duration-200",
                dragOver && "scale-110 ring-primary/40",
                "group-active:scale-95",
              )}
            >
              {isFront ? (
                <User className="size-5 text-primary" aria-hidden />
              ) : (
                <ImagePlus className="size-5 text-primary" aria-hidden />
              )}
            </span>
            <span className="text-sm font-medium text-foreground">{addLabel}</span>
            <span className="max-w-[14rem] text-center text-xs leading-snug">
              {emptyHint}
            </span>
            <span
              className={cn(
                "hidden max-w-[14rem] text-center text-[11px] font-medium sm:block",
                dragOver ? "text-primary" : "text-primary/70",
              )}
            >
              {dragHint}
            </span>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onPickFront}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border bg-background px-2 text-xs font-medium shadow-sm transition-colors hover:bg-muted/60"
          >
            <Camera className="size-3.5 text-primary" aria-hidden />
            {cameraLabel}
          </button>
          <button
            type="button"
            onClick={onPickLibrary}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border bg-background px-2 text-xs font-medium shadow-sm transition-colors hover:bg-muted/60"
          >
            <ImageIcon className="size-3.5 text-primary" aria-hidden />
            {albumLabel}
          </button>
        </div>
        {slotErrorBlock}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
          multiple
          className="sr-only"
          onChange={(e) => {
            onFileChange(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    );
  }

  return (
    <figure className="flex flex-col gap-2 motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-95 motion-safe:duration-300">
      <SlotLabel label={label} recommended={isFront} filled />
      <div {...dropHandlers} className={dropRing}>
        <div
          className={cn(
            "relative aspect-[3/4] overflow-hidden rounded-2xl border bg-muted shadow-md transition-all duration-300",
            dragOver
              ? "border-primary ring-2 ring-primary/40"
              : "ring-2 ring-primary/15",
            replacing && "scale-[0.98] opacity-90",
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={item.url}
            src={item.url}
            alt={label}
            className={cn(
              "size-full object-cover transition-all duration-300 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300",
              dragOver ? "scale-105 brightness-95" : "hover:scale-[1.02]",
            )}
          />
          {dragOver ? (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/25 backdrop-blur-[2px] motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150">
              <p className="rounded-full bg-background/95 px-3 py-1.5 text-xs font-semibold text-primary shadow-md">
                {replaceHint}
              </p>
            </div>
          ) : null}
          {replacing ? (
            <div className="pointer-events-none absolute inset-0 bg-primary/20 motion-safe:animate-out motion-safe:fade-out motion-safe:duration-300" />
          ) : null}
          <div className="pointer-events-none absolute inset-x-0 top-0 bg-linear-to-b from-black/50 to-transparent px-2.5 pb-6 pt-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-foreground shadow-sm backdrop-blur dark:bg-black/70 dark:text-white">
              {isFront ? (
                <User className="size-3" aria-hidden />
              ) : (
                <ImageIcon className="size-3" aria-hidden />
              )}
              {label}
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetake}
          className="min-h-11 gap-1.5 text-xs sm:min-h-10"
        >
          <RefreshCw className="size-3.5" aria-hidden />
          {retakeLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRemove}
          className="min-h-11 gap-1.5 border-destructive/30 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive sm:min-h-10"
          aria-label={removeLabel}
        >
          <Trash2 className="size-3.5" aria-hidden />
          {removeLabel}
        </Button>
      </div>
      {slotErrorBlock}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) triggerReplaceFlash();
          onFileChange(e.target.files);
          e.target.value = "";
        }}
      />
    </figure>
  );
}

function SlotLabel({
  label,
  recommended,
  filled,
}: {
  label: string;
  recommended?: boolean;
  filled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-0.5">
      <p className="text-xs font-semibold text-foreground">{label}</p>
      {recommended && !filled ? (
        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
          *
        </span>
      ) : null}
    </div>
  );
}

function PhotoTipsCard({ title, tips }: { title: string; tips: string[] }) {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
      <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200">
        <Lightbulb className="size-3.5" aria-hidden />
        {title}
      </div>
      <ul className="space-y-0.5 text-xs leading-relaxed text-foreground/80">
        {tips.map((tip, i) => (
          <li key={`tip-${i}`} className="flex gap-1.5">
            <span className="mt-1 size-1 shrink-0 rounded-full bg-amber-500/70" aria-hidden />
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
