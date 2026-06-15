"use client";

import { Download, RefreshCw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { IconDismissButton } from "@/components/ui/icon-dismiss-button";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------
 * Testing this component locally
 * -------------------------------------------------------------------------
 * The service worker only registers in production builds, so:
 *
 *   npm run build && npm start
 *
 * 1. Install prompt
 *    Chrome / Edge desktop: open `chrome://flags/#bypass-app-banner-engagement-checks`,
 *    enable it, restart, then visit the app — `beforeinstallprompt` fires on
 *    first load. On Android Chrome the banner shows after the engagement
 *    heuristic (~30s of interaction). iOS Safari never fires the event;
 *    the user installs via Share → Add to Home Screen using the meta tags
 *    declared in `app/layout.tsx`.
 *
 * 2. Update notification
 *    a) Build & start. Visit the app, then keep the tab open.
 *    b) Bump `CACHE_VERSION` in `public/sw.js`, rebuild, restart.
 *    c) In the open tab open DevTools → Application → Service Workers and
 *       click "Update". The "new version available" toast should appear.
 *
 * 3. Offline UX
 *    DevTools → Network → throttle to "Offline". The slim top bar
 *    (`<OfflineIndicator />`) should slide in immediately. On `/check-in`
 *    the in-flow `<OfflineNotice />` warns before the form.
 *
 * 4. Lighthouse PWA audit
 *    DevTools → Lighthouse → "Progressive Web App" category. Should pass
 *    installable, themed status bar, manifest, icons, and SW.
 * ----------------------------------------------------------------------- */

/**
 * BeforeInstallPromptEvent isn't in the standard lib types yet; this is the
 * subset we actually use from the spec.
 */
type BeforeInstallPromptEvent = Event & {
  readonly platforms: readonly string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
};

const DISMISS_KEY = "dadiary:pwa-install-dismissed-at";
// Re-show the install prompt at most once per week after a dismissal so we
// don't nag users who deliberately closed it.
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
// How often we ask the SW to check for updates while the tab is open. One
// hour balances staying current with not hammering the network.
const UPDATE_POLL_MS = 60 * 60 * 1000;

/**
 * Mounts the service worker, surfaces a small "install app" toast, and shows
 * a "new version available" banner whenever a fresh service worker has
 * downloaded in the background. The user keeps control: we never refresh or
 * activate a new SW without an explicit click.
 */
export function PwaRegister() {
  const t = useTranslations("pwa");

  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);
  const [installHidden, setInstallHidden] = useState(false);

  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [updating, setUpdating] = useState(false);
  /** True only after the user taps "Apply update" — avoids reload on first SW install. */
  const pendingReloadRef = useRef(false);
  const refreshingRef = useRef(false);

  // ---------------------------------------------------------------------
  // 1. Service worker lifecycle
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let pollHandle: ReturnType<typeof setInterval> | null = null;

    /** Listen for a worker reaching the `installed` state — that's the moment
     *  to tell the user a new version is ready. */
    const trackInstalling = (worker: ServiceWorker) => {
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          setWaitingWorker(worker);
        }
      });
    };

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });

        // Worker that finished installing before this listener attached.
        if (reg.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(reg.waiting);
        }
        if (reg.installing) trackInstalling(reg.installing);

        reg.addEventListener("updatefound", () => {
          const next = reg.installing;
          if (next) trackInstalling(next);
        });

        // Periodic check so long-lived sessions still pick up new versions
        // without requiring a reload.
        pollHandle = setInterval(() => {
          reg.update().catch(() => {
            // network errors are fine — we'll try again next interval
          });
        }, UPDATE_POLL_MS);
      } catch (err) {
        console.warn("[pwa] service worker registration failed", err);
      }
    };

    /** Reload only when the user accepted an update — not on first SW install/claim. */
    const onControllerChange = () => {
      if (!pendingReloadRef.current) return;
      if (refreshingRef.current) return;
      refreshingRef.current = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", () => void register(), { once: true });
    }

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      if (pollHandle) clearInterval(pollHandle);
    };
  }, []);

  // ---------------------------------------------------------------------
  // 2. beforeinstallprompt — defer the native prompt to our own toast
  // ---------------------------------------------------------------------
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    if (recentlyDismissed()) return;

    const onBefore = (event: Event) => {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstallEvent(null);
      setInstallHidden(true);
    };

    window.addEventListener("beforeinstallprompt", onBefore);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBefore);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installEvent) return;
    setInstalling(true);
    try {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === "dismissed") markDismissed();
    } catch (err) {
      console.warn("[pwa] install prompt failed", err);
    } finally {
      setInstalling(false);
      setInstallEvent(null);
    }
  }, [installEvent]);

  const handleInstallDismiss = useCallback(() => {
    markDismissed();
    setInstallHidden(true);
  }, []);

  // ---------------------------------------------------------------------
  // 3. Update CTA — explicit user-driven refresh
  // ---------------------------------------------------------------------
  const handleApplyUpdate = useCallback(() => {
    if (!waitingWorker) return;
    setUpdating(true);
    pendingReloadRef.current = true;
    // The SW listens for SKIP_WAITING and activates; controllerchange reloads once.
    waitingWorker.postMessage({ type: "SKIP_WAITING" });
  }, [waitingWorker]);

  const handleUpdateDismiss = useCallback(() => {
    setWaitingWorker(null);
  }, []);

  const showUpdate = waitingWorker !== null;
  const showInstall = !showUpdate && installEvent !== null && !installHidden;

  if (!showUpdate && !showInstall) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-3 bottom-3 z-50 flex flex-col items-stretch gap-2 sm:bottom-4 sm:left-auto sm:right-4 sm:max-w-sm"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {showUpdate && (
        <ToastShell
          tone="info"
          icon={<RefreshCw className="size-4" aria-hidden />}
          title={t("updateTitle")}
          description={t("updateDescription")}
          primary={{
            label: updating ? t("updating") : t("updateCta"),
            onClick: handleApplyUpdate,
            disabled: updating,
          }}
          secondary={{
            label: t("updateLater"),
            onClick: handleUpdateDismiss,
            ariaLabel: t("updateDismiss"),
          }}
          dialogLabel={t("updateDialogLabel")}
        />
      )}

      {showInstall && (
        <ToastShell
          tone="brand"
          icon={<Download className="size-4" aria-hidden />}
          title={t("title")}
          description={t("description")}
          primary={{
            label: installing ? t("installing") : t("install"),
            onClick: handleInstall,
            disabled: installing,
          }}
          secondary={{
            label: t("later"),
            onClick: handleInstallDismiss,
            ariaLabel: t("dismiss"),
          }}
          dialogLabel={t("dialogLabel")}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// Shared toast shell
// ---------------------------------------------------------------------

type ToastAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
};

function ToastShell({
  tone,
  icon,
  title,
  description,
  primary,
  secondary,
  dialogLabel,
}: {
  tone: "brand" | "info";
  icon: React.ReactNode;
  title: string;
  description: string;
  primary: ToastAction;
  secondary: ToastAction;
  dialogLabel: string;
}) {
  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={dialogLabel}
      className={cn(
        "pointer-events-auto relative flex flex-col gap-3 rounded-2xl border bg-popover/95 p-4 shadow-lg backdrop-blur",
        "supports-backdrop-filter:bg-popover/85",
        "animate-in slide-in-from-bottom-2 fade-in duration-300 motion-reduce:animate-none",
        tone === "info" ? "border-primary/40" : "border-border",
      )}
    >
      <IconDismissButton
        onClick={secondary.onClick}
        ariaLabel={secondary.ariaLabel ?? secondary.label}
        className="absolute right-1 top-1"
      >
        <X className="size-4" aria-hidden />
      </IconDismissButton>

      <div className="flex items-start gap-3 pr-6">
        <span
          aria-hidden
          className={cn(
            "mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl",
            tone === "info"
              ? "bg-primary/15 text-primary"
              : "bg-linear-to-br from-primary/15 to-accent/40 text-primary",
          )}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={secondary.onClick} disabled={primary.disabled}>
          {secondary.label}
        </Button>
        <Button size="sm" onClick={primary.onClick} disabled={primary.disabled}>
          {primary.label}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------

function isStandalone() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // iOS Safari quirk: navigator.standalone signals "Add to Home Screen".
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

function recentlyDismissed() {
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

function markDismissed() {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // ignore — private mode / storage disabled
  }
}
