"use client";

import { Check, Download, ImageIcon, Loader2, Share2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ProgressPhoto } from "@/components/progress/progress-photo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  canSharePhotoPair,
  formatShareDate,
  sharePhotoKey,
  beforeAfterShareFilename,
  type SharePhotoRef,
} from "@/lib/share/before-after";
import { renderBeforeAfterCard } from "@/lib/share/render-share-card";
import {
  canNativeShareFiles,
  downloadBlob,
  nativeShareImageFile,
} from "@/lib/skin-review-share-image";
import { cn } from "@/lib/utils";

const SHARE_SITE = "https://dadiary.vn";

type PickerSlot = "before" | "after";

export function BeforeAfterShareDialog({
  open,
  onOpenChange,
  photos,
  initialBefore,
  initialAfter,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photos: SharePhotoRef[];
  initialBefore: SharePhotoRef;
  initialAfter: SharePhotoRef;
}) {
  const t = useTranslations("progress.beforeAfter.share");
  const tBa = useTranslations("progress.beforeAfter");
  const locale = useLocale();
  const { success: toastSuccess, error: toastError } = useToast();
  const [before, setBefore] = useState(initialBefore);
  const [after, setAfter] = useState(initialAfter);
  const [picker, setPicker] = useState<PickerSlot | null>(null);
  const [busy, setBusy] = useState<"share" | "save" | null>(null);
  const [canFileShare, setCanFileShare] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBefore(initialBefore);
    setAfter(initialAfter);
    setPicker(null);
  }, [open, initialBefore, initialAfter]);

  useEffect(() => {
    setCanFileShare(canNativeShareFiles());
  }, []);

  const pairOk = canSharePhotoPair(before, after);
  const latestKey = photos[0] ? sharePhotoKey(photos[0]) : null;

  const copy = useMemo(
    () => ({
      brandMark: t("brandMark"),
      headline: t("headline"),
      beforeLabel: tBa("before"),
      afterLabel: tBa("after"),
      ctaLine: t("ctaLine"),
      disclaimer: t("disclaimer"),
    }),
    [t, tBa],
  );

  const runExport = useCallback(
    async (mode: "share" | "save") => {
      if (!pairOk || busy) return;
      setBusy(mode);
      try {
        const blob = await renderBeforeAfterCard({ before, after, copy });
        const filename = beforeAfterShareFilename(before.date, after.date);
        const title = t("shareTitle");
        const text = t("shareText", { url: `${SHARE_SITE}/${locale}` });

        if (mode === "share" && canFileShare) {
          const result = await nativeShareImageFile(blob, filename, title);
          if (result === "shared") {
            toastSuccess({ title: t("shared") });
            return;
          }
          if (result === "aborted") return;
        }

        downloadBlob(blob, filename);
        toastSuccess({
          title: t("saved"),
          description: mode === "share" && !canFileShare ? text : undefined,
        });
      } catch {
        toastError({ title: t("failed") });
      } finally {
        setBusy(null);
      }
    },
    [after, before, busy, canFileShare, copy, locale, pairOk, t, toastError, toastSuccess],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg" aria-busy={busy != null}>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("body")}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <ShareSlot
            label={tBa("before")}
            photo={before}
            changeLabel={tBa("changePhoto")}
            onChange={() => setPicker("before")}
          />
          <ShareSlot
            label={tBa("after")}
            photo={after}
            changeLabel={tBa("changePhoto")}
            onChange={() => setPicker("after")}
            highlight
          />
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground">{t("privacy")}</p>
        <p
          data-testid="share-ugc-hint"
          className="text-xs leading-relaxed text-muted-foreground"
        >
          {t("ugcHint")}
        </p>

        <DialogFooter className="gap-2 sm:justify-stretch">
          <Button
            type="button"
            variant="outline"
            className="min-h-11 flex-1 gap-2"
            disabled={!pairOk || busy != null}
            onClick={() => void runExport("save")}
          >
            {busy === "save" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Download className="size-4" aria-hidden />
            )}
            {t("save")}
          </Button>
          <Button
            type="button"
            className="min-h-11 flex-1 gap-2"
            disabled={!pairOk || busy != null}
            onClick={() => void runExport("share")}
          >
            {busy === "share" ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Share2 className="size-4" aria-hidden />
            )}
            {t("share")}
          </Button>
        </DialogFooter>

        {picker ? (
          <MiniPhotoPicker
            title={picker === "before" ? tBa("pickerBeforeTitle") : tBa("pickerAfterTitle")}
            closeLabel={tBa("pickerClose")}
            latestLabel={tBa("latestBadge")}
            latestKey={latestKey}
            items={photos}
            selected={picker === "before" ? before : after}
            onSelect={(sel) => {
              if (picker === "before") setBefore(sel);
              else setAfter(sel);
              setPicker(null);
            }}
            onClose={() => setPicker(null)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ShareSlot({
  label,
  photo,
  changeLabel,
  onChange,
  highlight,
}: {
  label: string;
  photo: SharePhotoRef;
  changeLabel: string;
  onChange: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-label={`${changeLabel} — ${label}`}
      className={cn(
        "group relative block w-full overflow-hidden rounded-xl border bg-muted text-left shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary/50",
        highlight ? "ring-2 ring-primary/40" : "ring-1 ring-transparent hover:ring-primary/20",
      )}
    >
      <div className="relative aspect-square w-full">
        <ProgressPhoto url={photo.url} alt={`${label} · ${formatShareDate(photo.date)}`} />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent px-2 py-1.5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/90">{label}</p>
        <p className="text-[11px] tabular-nums text-white">{formatShareDate(photo.date)}</p>
      </div>
      <span className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-[10px] font-medium text-foreground shadow-sm ring-1 ring-border/60">
          <ImageIcon className="size-3" aria-hidden />
          {changeLabel}
        </span>
      </span>
    </button>
  );
}

function MiniPhotoPicker({
  title,
  closeLabel,
  items,
  selected,
  latestKey,
  latestLabel,
  onSelect,
  onClose,
}: {
  title: string;
  closeLabel: string;
  items: SharePhotoRef[];
  selected: SharePhotoRef;
  latestKey: string | null;
  latestLabel: string;
  onSelect: (sel: SharePhotoRef) => void;
  onClose: () => void;
}) {
  const selectedKey = sharePhotoKey(selected);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col rounded-2xl bg-background/95 p-3 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold tracking-tight">{title}</h4>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onClose} aria-label={closeLabel}>
          <X className="size-4" aria-hidden />
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
        {items.map((item) => {
          const key = sharePhotoKey(item);
          const isSelected = key === selectedKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(item)}
              aria-pressed={isSelected}
              className={cn(
                "relative overflow-hidden rounded-xl border bg-muted outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                isSelected ? "ring-2 ring-primary" : "ring-1 ring-transparent",
              )}
            >
              <div className="relative aspect-square w-full">
                <ProgressPhoto url={item.url} alt={formatShareDate(item.date)} />
              </div>
              {key === latestKey ? (
                <span className="absolute left-1 top-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground">
                  {latestLabel}
                </span>
              ) : null}
              {isSelected ? (
                <span className="absolute bottom-1 right-1 inline-flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-2.5" aria-hidden />
                </span>
              ) : null}
              <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent px-1.5 pb-1 pt-4 text-[10px] font-medium tabular-nums text-white">
                {formatShareDate(item.date)}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
