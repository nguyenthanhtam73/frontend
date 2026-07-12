"use client";

import {
  ArrowUpFromLine,
  Plus,
  Share,
  SquareArrowOutUpRight,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { IconDismissButton } from "@/components/ui/icon-dismiss-button";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------
 * iOS "Add to Home Screen" hint
 * -------------------------------------------------------------------------
 * iOS Safari never fires `beforeinstallprompt`, so the automatic install
 * toast in <PwaRegister /> can't help iPhone/iPad users. This banner nudges
 * them toward the manual Share → Add to Home Screen flow instead.
 *
 * It only renders when ALL of the following hold:
 *   - the device is iOS (iPhone/iPad, incl. iPadOS masquerading as macOS)
 *   - the browser can actually add to the home screen (Safari always; other
 *     iOS browsers only from iOS 16.4+)
 *   - the app isn't already installed (not running standalone)
 *   - the user hasn't dismissed the banner within the cooldown window
 * ----------------------------------------------------------------------- */

const DISMISS_KEY = "dadiary_ios_pwa_dismissed";
// Don't nag: once dismissed, stay quiet for a week before offering again.
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
// Small delay so the banner slides in after first paint rather than fighting
// the initial render. 900ms feels natural — present but not jarring.
const SHOW_DELAY_MS = 900;

export function IosInstallBanner() {
  const t = useTranslations("iosInstall");

  // `mounted` gates the portal until `document.body` exists (SSR safety).
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isIosDevice()) return;
    if (isStandalone()) return;
    if (!isPwaCapableIosBrowser()) return;
    if (recentlyDismissed()) return;

    const id = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(id);
  }, []);

  const dismiss = useCallback(() => {
    markDismissed();
    setGuideOpen(false);
    setVisible(false);
  }, []);

  if (!mounted || !visible) return null;

  return createPortal(
    <>
      {/* Bottom banner */}
      <div
        className="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex justify-center sm:left-auto sm:right-4 sm:max-w-sm"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div
          role="dialog"
          aria-live="polite"
          aria-label={t("bannerTitle")}
          className={cn(
            "pointer-events-auto relative w-full rounded-2xl border border-primary/30 bg-popover/95 p-4 shadow-lg backdrop-blur",
            "supports-backdrop-filter:bg-popover/85",
            "motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:fade-in motion-safe:duration-300",
          )}
        >
          <IconDismissButton
            onClick={dismiss}
            ariaLabel={t("dismiss")}
            className="absolute right-1 top-1 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" aria-hidden />
          </IconDismissButton>

          <div className="flex items-start gap-3 pr-6">
            <span
              aria-hidden
              className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-primary/15 to-accent/40 text-primary"
            >
              <ArrowUpFromLine className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug text-foreground">
                {t("bannerTitle")}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {t("bannerDescription")}
              </p>
            </div>
          </div>

          {/* min-h-11 keeps both buttons at a ≥44px touch target on mobile. */}
          <div className="mt-3 flex items-center justify-end gap-2">
            <Button variant="ghost" size="sm" className="min-h-11" onClick={dismiss}>
              {t("gotIt")}
            </Button>
            <Button size="sm" className="min-h-11" onClick={() => setGuideOpen(true)}>
              {t("guideCta")}
            </Button>
          </div>
        </div>
      </div>

      {/* Detailed 3-step guide modal */}
      {guideOpen ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center">
          <button
            type="button"
            aria-label={t("guideClose")}
            className="absolute inset-0 bg-black/50 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200"
            onClick={() => setGuideOpen(false)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="ios-guide-title"
            className="relative w-full max-w-md space-y-4 rounded-2xl border bg-background p-5 shadow-2xl motion-safe:animate-in motion-safe:slide-in-from-bottom-4 motion-safe:fade-in motion-safe:duration-200"
          >
            <div className="space-y-1">
              <p id="ios-guide-title" className="text-base font-semibold leading-snug">
                {t("guideTitle")}
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {t("guideIntro")}
              </p>
            </div>

            <ol className="space-y-3">
              <GuideStep index={1} icon={<Share className="size-4" aria-hidden />} text={t("step1")} />
              <GuideStep index={2} icon={<Plus className="size-4" aria-hidden />} text={t("step2")} />
              <GuideStep
                index={3}
                icon={<SquareArrowOutUpRight className="size-4" aria-hidden />}
                text={t("step3")}
              />
            </ol>

            <div className="flex justify-end">
              <Button size="sm" className="min-h-11 sm:min-h-9" onClick={dismiss}>
                {t("guideClose")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>,
    document.body,
  );
}

/** A single numbered step with an inline icon standing in for the iOS control. */
function GuideStep({
  index,
  icon,
  text,
}: {
  index: number;
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <li className="flex items-start gap-3">
      <span
        aria-hidden
        className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground"
      >
        {index}
      </span>
      <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">{text}</p>
      <span
        aria-hidden
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border bg-muted/50 text-primary"
      >
        {icon}
      </span>
    </li>
  );
}

// ---------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------

/** True on iPhone/iPad/iPod — including iPadOS 13+ that masquerades as macOS. */
function isIosDevice(): boolean {
  if (typeof navigator === "undefined" || typeof document === "undefined") return false;
  const ua = navigator.userAgent || "";
  // Three-pronged check for robustness:
  //  1. classic iOS UA,
  //  2. iPadOS 13+ that reports a desktop macOS UA (distinguished by touch),
  //  3. a touch-capable fallback for cases where the UA is stripped/spoofed.
  // The Safari-only capability gate (isPwaCapableIosBrowser) prevents this
  // broad touch fallback from ever firing on non-Apple devices (e.g. Android).
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
    "ontouchend" in document
  );
}

/** True when the PWA is already launched from the home screen. */
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // iOS Safari exposes standalone launches on the legacy navigator flag.
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

/** Parses the major/minor iOS version from the UA, e.g. "OS 16_4" → [16, 4]. */
function iosVersion(): [number, number] | null {
  const match = /OS (\d+)_(\d+)/.exec(navigator.userAgent || "");
  if (!match) return null;
  return [Number(match[1]), Number(match[2])];
}

/**
 * Safari can always add to the home screen. Chrome (CriOS), Firefox (FxiOS)
 * and Edge (EdgiOS) on iOS only gained the feature in iOS 16.4, so gate those.
 */
function isPwaCapableIosBrowser(): boolean {
  const ua = navigator.userAgent || "";
  // Android UAs also contain "Safari"; never treat them as an iOS browser.
  if (/android/i.test(ua)) return false;
  const isSafari = /^((?!crios|fxios|edgios|opios).)*safari/i.test(ua);
  if (isSafari) return true;

  const version = iosVersion();
  if (!version) return false;
  const [major, minor] = version;
  return major > 16 || (major === 16 && minor >= 4);
}

function recentlyDismissed(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markDismissed(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // ignore — private mode / storage disabled
  }
}
