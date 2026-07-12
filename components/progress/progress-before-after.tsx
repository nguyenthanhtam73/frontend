"use client";

import {
  ArrowLeftRight,
  ArrowRight,
  Camera,
  Check,
  ImageIcon,
  Pencil,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ProgressPhoto } from "@/components/progress/progress-photo";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent } from "@/components/ui/card";
import type { ProgressEntryDTO, ProgressRangeKey } from "@/lib/types/progress";
import { cn } from "@/lib/utils";

/** Which slot the photo picker is currently editing. */
type PickerSlot = "before" | "after";

/** A manual selection points at one specific photo: an entry + the image index
 *  inside that entry's `image_urls`. A single check-in can carry several photos,
 *  so the index is what lets the user compare two shots from the same day. */
type PhotoSelection = { entryId: string; imageIndex: number };

/** A flattened, ready-to-render photo (one per image, not per entry). */
type PhotoItem = {
  entryId: string;
  imageIndex: number;
  url: string;
  date: string;
  score?: number;
  totalInEntry: number;
};

/** Stable string key for a photo item / selection (for React keys + equality). */
function selKey(sel: { entryId: string; imageIndex: number }): string {
  return `${sel.entryId}#${sel.imageIndex}`;
}

/** localStorage key used to remember the user's manual before/after picks. */
const STORAGE_KEY = "dadiary_progress_before_after_selection";

/** Narrow arbitrary JSON back into a PhotoSelection (or null if malformed). */
function coerceSelection(v: unknown): PhotoSelection | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  if (typeof o.entryId === "string" && typeof o.imageIndex === "number" && o.imageIndex >= 0) {
    return { entryId: o.entryId, imageIndex: Math.floor(o.imageIndex) };
  }
  return null;
}

/** A selection is valid only if its entry still exists AND its image index is
 *  still within that entry's photo list (both can change when the range shifts). */
function isSelectionValid(sel: PhotoSelection | null, entries: ProgressEntryDTO[]): boolean {
  if (!sel) return false;
  return entries.some(
    (e) => e.id === sel.entryId && (e.image_urls?.length ?? 0) > sel.imageIndex,
  );
}

/** Before-After card — compare two check-in photos side by side.
 *
 *  Why side-by-side instead of a swipe-slider for v1?
 *  - Side-by-side reads instantly on mobile and desktop with zero JS interaction.
 *  - A slider implies "guess the line" but progress photos vary in lighting/angle
 *    so the user would mostly drag back and forth without insight.
 *
 *  Selection model:
 *  - By default we auto-pick the OLDEST photo (before) and NEWEST photo (after)
 *    in the current range — this preserves the original behaviour.
 *  - The user can override either side manually, pick any individual photo (even
 *    two photos from the same check-in), and swap the two sides. Manual picks are
 *    stored as { entryId, imageIndex } so they survive re-fetches, and are pruned
 *    automatically when the range changes and the photo is no longer available. */
export function ProgressBeforeAfter({
  entries,
  range,
}: {
  entries: ProgressEntryDTO[];
  /** Active range from the timeline — a change means the photo set may shift. */
  range: ProgressRangeKey;
}) {
  const t = useTranslations("progress.beforeAfter");

  // Only entries that actually carry a photo can be compared. `entries` arrive
  // newest-first from the API, so index 0 = latest, last = oldest.
  const photoEntries = useMemo(
    () => entries.filter((e) => (e.image_urls?.length ?? 0) > 0),
    [entries],
  );

  // Flatten every entry into individual photo items so the picker can offer each
  // shot separately — a single check-in may carry multiple photos and the user
  // might want to compare two of them. Order mirrors the API: newest entry first,
  // and within an entry the stored image order (index 0 first). So photoItems[0]
  // is always the most recent photo, which we treat as "latest".
  const photoItems = useMemo<PhotoItem[]>(() => {
    const out: PhotoItem[] = [];
    for (const e of photoEntries) {
      const urls = e.image_urls ?? [];
      urls.forEach((url, imageIndex) => {
        out.push({
          entryId: e.id,
          imageIndex,
          url,
          date: e.check_date,
          score: e.gauges?.overall,
          totalInEntry: urls.length,
        });
      });
    }
    return out;
  }, [photoEntries]);

  // Auto defaults: newest photo (after) + oldest photo (before). We anchor to
  // imageIndex 0 of the newest / oldest entry to match the original behaviour.
  const autoAfterSel = useMemo<PhotoSelection | null>(
    () => (photoEntries.length ? { entryId: photoEntries[0].id, imageIndex: 0 } : null),
    [photoEntries],
  );
  const autoBeforeSel = useMemo<PhotoSelection | null>(
    () =>
      photoEntries.length
        ? { entryId: photoEntries[photoEntries.length - 1].id, imageIndex: 0 }
        : null,
    [photoEntries],
  );

  // Manual selections. `null` = follow the auto default. Stored as { entryId,
  // imageIndex } so a pick keeps pointing at the exact photo across re-fetches.
  const [beforeSel, setBeforeSel] = useState<PhotoSelection | null>(null);
  const [afterSel, setAfterSel] = useState<PhotoSelection | null>(null);
  const [picker, setPicker] = useState<PickerSlot | null>(null);

  // Guards the persist effect from clobbering stored data before we've had a
  // chance to read it back on mount.
  const hydratedRef = useRef(false);

  // Restore the user's manual picks from localStorage once, on mount. We only
  // apply a side if it is still valid against the photos currently in range;
  // anything stale is dropped (and the whole key cleared if nothing survives).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { beforeSel?: unknown; afterSel?: unknown };
        const savedBefore = coerceSelection(parsed.beforeSel);
        const savedAfter = coerceSelection(parsed.afterSel);
        const okBefore = isSelectionValid(savedBefore, photoEntries);
        const okAfter = isSelectionValid(savedAfter, photoEntries);
        if (!okBefore && !okAfter) {
          window.localStorage.removeItem(STORAGE_KEY);
        } else {
          if (okBefore) setBeforeSel(savedBefore);
          if (okAfter) setAfterSel(savedAfter);
        }
      }
    } catch {
      // Corrupt / unavailable storage — start clean so we never wedge the UI.
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    } finally {
      hydratedRef.current = true;
    }
    // Mount-only: subsequent range changes are handled by the prune effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist manual picks. In auto mode (both null) we remove the key entirely so
  // nothing is stored while the user isn't actively choosing photos.
  useEffect(() => {
    if (!hydratedRef.current) return; // don't run before the initial read completes
    try {
      if (beforeSel == null && afterSel == null) {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ beforeSel, afterSel }));
      }
    } catch {
      /* storage may be full or blocked — persistence is best-effort */
    }
  }, [beforeSel, afterSel]);

  // Stable signature of every available photo. When it changes (range switch or
  // fresh data), prune any manual pick whose entry disappeared or whose image
  // index is now out of range, so we fall back to the auto oldest/newest. The
  // persist effect above then clears/rewrites localStorage to match.
  const idsKey = useMemo(() => photoItems.map(selKey).join(","), [photoItems]);
  useEffect(() => {
    setBeforeSel((s) => (isSelectionValid(s, photoEntries) ? s : null));
    setAfterSel((s) => (isSelectionValid(s, photoEntries) ? s : null));
    setPicker(null);
    // `range` is included so a range switch always re-evaluates selections even if
    // the id list happens to overlap; `photoEntries` is read fresh inside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, range]);

  // Resolve a selection into a concrete, renderable photo item (or null if gone).
  const resolve = useCallback(
    (sel: PhotoSelection | null): PhotoItem | null => {
      if (!sel) return null;
      const e = photoEntries.find((x) => x.id === sel.entryId);
      const url = e?.image_urls?.[sel.imageIndex];
      if (!e || !url) return null;
      return {
        entryId: e.id,
        imageIndex: sel.imageIndex,
        url,
        date: e.check_date,
        score: e.gauges?.overall,
        totalInEntry: e.image_urls?.length ?? 1,
      };
    },
    [photoEntries],
  );

  const before = resolve(beforeSel) ?? resolve(autoBeforeSel);
  const after = resolve(afterSel) ?? resolve(autoAfterSel);

  const isManual = beforeSel != null || afterSel != null;
  const latestKey = photoItems.length > 0 ? selKey(photoItems[0]) : null;

  const handlePick = useCallback((slot: PickerSlot, sel: PhotoSelection) => {
    if (slot === "before") setBeforeSel(sel);
    else setAfterSel(sel);
    setPicker(null);
  }, []);

  const resetAuto = useCallback(() => {
    setBeforeSel(null);
    setAfterSel(null);
    // Explicitly forget the stored choice when the user opts back into auto mode.
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  // Swap Before ↔ After. We first materialise both sides to concrete selections
  // (falling back to the current auto default) so the swap is predictable even if
  // one side was still on auto — otherwise "auto after" would snap back to newest.
  const swap = useCallback(() => {
    const curBefore = beforeSel ?? autoBeforeSel;
    const curAfter = afterSel ?? autoAfterSel;
    setBeforeSel(curAfter);
    setAfterSel(curBefore);
  }, [beforeSel, afterSel, autoBeforeSel, autoAfterSel]);

  // Level 1.4 — need at least two photos overall to compare. Counting individual
  // photos (not entries) means one check-in with two shots is enough.
  if (photoItems.length < 2) {
    return <NotEnoughPhotos />;
  }

  if (!before || !after) {
    return null; // graceful fallback when either side has no usable photo
  }

  // Only badge the After slot as "Latest" when it truly is the newest photo — if
  // the user manually picked an older one, the badge would be misleading.
  const afterIsLatest = latestKey != null && selKey(after) === latestKey;

  return (
    <Card>
      <CardContent className="space-y-3 pt-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Camera className="size-4 text-primary" aria-hidden />
              <h3 className="text-sm font-semibold tracking-tight">{t("title")}</h3>
            </div>
            {/* Manual-mode indicator — lets the user know the pair isn't the
                automatic oldest/newest anymore. Hidden entirely in auto mode. */}
            {isManual ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                <Pencil className="size-3" aria-hidden />
                {t("manualBadge")}
              </span>
            ) : null}
          </div>
          {isManual ? (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={resetAuto}
              className="gap-1 text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="size-3" aria-hidden />
              {t("resetAuto")}
            </Button>
          ) : null}
        </div>

        {/* Level 1.1 — guidance caption. */}
        <p className="text-sm text-muted-foreground">{t("caption")}</p>

        <div className="relative">
          <div className="grid grid-cols-2 gap-3">
            <PhotoSlot
              label={t("before")}
              date={before.date}
              score={before.score}
              url={before.url}
              imageLabel={photoLabel(before)}
              changeLabel={t("changePhoto")}
              onChange={() => setPicker("before")}
            />
            <PhotoSlot
              label={t("after")}
              date={after.date}
              score={after.score}
              url={after.url}
              imageLabel={photoLabel(after)}
              changeLabel={t("changePhoto")}
              badge={afterIsLatest ? t("latestBadge") : undefined}
              onChange={() => setPicker("after")}
              highlight
            />
          </div>

          {/* Swap sits centered between the two tiles; only in manual mode. It
              floats above the photo buttons (z-20) so it's tappable on mobile. */}
          {isManual ? (
            <button
              type="button"
              onClick={swap}
              aria-label={t("swap")}
              title={t("swap")}
              className="absolute left-1/2 top-1/2 z-20 inline-flex size-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-foreground shadow-md outline-none transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-95"
            >
              <ArrowLeftRight className="size-4" aria-hidden />
            </button>
          ) : null}
        </div>

        {before.score != null && after.score != null ? (
          <DeltaRow before={before.score} after={after.score} />
        ) : null}
      </CardContent>

      {picker ? (
        <PhotoPicker
          slot={picker}
          items={photoItems}
          selected={picker === "before" ? beforeSel ?? autoBeforeSel : afterSel ?? autoAfterSel}
          latestKey={latestKey}
          latestLabel={t("latestBadge")}
          onSelect={(sel) => handlePick(picker, sel)}
          onClose={() => setPicker(null)}
        />
      ) : null}
    </Card>
  );
}

/** One comparison slot. The whole tile is a button that opens the photo picker. */
function PhotoSlot({
  label,
  date,
  score,
  url,
  imageLabel,
  changeLabel,
  onChange,
  badge,
  highlight,
}: {
  label: string;
  date: string;
  score?: number;
  url: string;
  /** e.g. "2/3" when the source check-in has multiple photos; undefined otherwise. */
  imageLabel?: string;
  changeLabel: string;
  onChange: () => void;
  badge?: string;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-label={`${changeLabel} — ${label}`}
      className={cn(
        "group relative block w-full overflow-hidden rounded-xl border bg-muted shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary/50",
        highlight ? "ring-2 ring-primary/40" : "ring-1 ring-transparent hover:ring-primary/20",
      )}
    >
      <div className="relative aspect-square w-full">
        {/* keyed wrapper → gentle fade whenever the chosen photo changes */}
        <div
          key={url}
          className="size-full motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
        >
          <ProgressPhoto url={url} alt={`${label} · ${formatDate(date)}`} />
        </div>
      </div>

      {badge ? (
        <span className="absolute left-1.5 top-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-sm">
          {badge}
        </span>
      ) : null}
      {score != null ? (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-background/85 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground shadow-sm backdrop-blur">
          {Math.round(score * 100)}%
        </span>
      ) : null}
      {imageLabel ? (
        <span className="absolute right-1.5 bottom-9 rounded-full bg-background/80 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-foreground shadow-sm backdrop-blur">
          {imageLabel}
        </span>
      ) : null}

      {/* Level 1.3 — label + clearly formatted capture date under the photo. */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent px-2 py-1.5 text-left">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-white/90">{label}</p>
        <p className="text-[11px] tabular-nums text-white">{formatDate(date)}</p>
      </div>

      {/* Change affordance — appears on hover/focus so the tile reads as tappable. */}
      <span className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-1 text-[10px] font-medium text-foreground shadow-sm ring-1 ring-border/60">
          <ImageIcon className="size-3" aria-hidden />
          {changeLabel}
        </span>
      </span>
    </button>
  );
}

/** Bottom-sheet (mobile) / centered modal (desktop) grid to pick a photo.
 *
 *  Works on the flattened `items` list, so entries with multiple photos surface
 *  each shot as its own selectable tile (with a "i/n" chip to tell them apart).
 *  Built inline instead of a shared Dialog primitive because the design system
 *  doesn't ship one yet; this stays self-contained and accessible (role="dialog",
 *  Escape to close, backdrop click, body scroll lock). */
function PhotoPicker({
  slot,
  items,
  selected,
  latestKey,
  latestLabel,
  onSelect,
  onClose,
}: {
  slot: PickerSlot;
  items: PhotoItem[];
  selected: PhotoSelection | null;
  latestKey: string | null;
  latestLabel: string;
  onSelect: (sel: PhotoSelection) => void;
  onClose: () => void;
}) {
  const t = useTranslations("progress.beforeAfter");
  const title = slot === "before" ? t("pickerBeforeTitle") : t("pickerAfterTitle");
  const selectedKey = selected ? selKey(selected) : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        aria-label={t("pickerClose")}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/50 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
      />
      <div className="relative z-10 flex max-h-[80vh] w-full max-w-lg flex-col rounded-t-2xl border bg-background shadow-lg motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:duration-300 sm:rounded-2xl sm:zoom-in-95">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h4 className="text-sm font-semibold tracking-tight">{title}</h4>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label={t("pickerClose")}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2.5 overflow-y-auto p-4 sm:grid-cols-4">
          {items.map((item) => {
            const key = selKey(item);
            const isSelected = key === selectedKey;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelect({ entryId: item.entryId, imageIndex: item.imageIndex })}
                aria-pressed={isSelected}
                className={cn(
                  "group relative overflow-hidden rounded-xl border bg-muted text-left shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary/50",
                  isSelected
                    ? "ring-2 ring-primary"
                    : "ring-1 ring-transparent hover:ring-primary/30",
                )}
              >
                <div className="relative aspect-square w-full">
                  <ProgressPhoto url={item.url} alt={formatDate(item.date)} />
                </div>
                {key === latestKey ? (
                  <span className="absolute left-1 top-1 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-semibold text-primary-foreground shadow-sm">
                    {latestLabel}
                  </span>
                ) : null}
                {item.score != null ? (
                  <span className="absolute right-1 top-1 rounded-full bg-background/85 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-foreground shadow-sm backdrop-blur">
                    {Math.round(item.score * 100)}%
                  </span>
                ) : null}
                {/* Distinguish multiple photos from the same check-in. */}
                {item.totalInEntry > 1 ? (
                  <span className="absolute bottom-1 left-1 rounded-full bg-background/80 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-foreground shadow-sm backdrop-blur">
                    {photoLabel(item)}
                  </span>
                ) : null}
                {isSelected ? (
                  <span className="absolute bottom-1 right-1 inline-flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                    <Check className="size-2.5" aria-hidden />
                  </span>
                ) : null}
                <div className="absolute inset-x-0 bottom-0 -z-0 bg-gradient-to-t from-black/50 to-transparent px-1.5 pb-1 pt-4">
                  <p className="text-[10px] font-medium tabular-nums text-white">
                    {formatDate(item.date)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Level 1.4 — clear empty state when fewer than 2 photos exist in the range. */
function NotEnoughPhotos() {
  const t = useTranslations("progress.beforeAfter");
  return (
    <Card className="border-dashed">
      <CardContent className="space-y-3 py-8 text-center">
        <span className="mx-auto inline-flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <ImageIcon className="size-5" aria-hidden />
        </span>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold tracking-tight">{t("notEnoughTitle")}</h3>
          <p className="mx-auto max-w-sm text-sm text-muted-foreground">{t("notEnoughBody")}</p>
        </div>
        <ButtonLink href="/check-in" size="sm" className="gap-1.5">
          <Sparkles className="size-3.5" aria-hidden />
          {t("notEnoughCta")}
        </ButtonLink>
      </CardContent>
    </Card>
  );
}

function DeltaRow({ before, after }: { before: number; after: number }) {
  const t = useTranslations("progress.beforeAfter");
  const delta = after - before;
  const pct = Math.round(delta * 100);
  const sign = pct > 0 ? "+" : "";
  const tone =
    pct > 3
      ? "text-emerald-700 dark:text-emerald-300"
      : pct < -3
        ? "text-amber-700 dark:text-amber-300"
        : "text-muted-foreground";
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs">
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        {Math.round(before * 100)}%
        <ArrowRight className="size-3" aria-hidden />
        {Math.round(after * 100)}%
      </span>
      <span className={`font-semibold tabular-nums ${tone}`}>{t("delta", { d: `${sign}${pct}` })}</span>
    </div>
  );
}

/** "i/n" label for a photo that belongs to a multi-photo check-in (else empty). */
function photoLabel(item: PhotoItem): string | undefined {
  if (item.totalInEntry <= 1) return undefined;
  return `${item.imageIndex + 1}/${item.totalInEntry}`;
}

/** Format an ISO "YYYY-MM-DD" date as "DD/MM/YYYY" for clear at-a-glance reading. */
function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}
