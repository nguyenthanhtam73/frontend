"use client";

import {
  AlertCircle,
  Bell,
  BellOff,
  BellRing,
  CheckCircle2,
  Info,
  Loader2,
  MonitorSmartphone,
  Send,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { ToastBanner } from "@/components/ui/toast-banner";
import {
  fetchActivePushSubscription,
  sendTestPush,
  subscribePush,
  unsubscribePush,
} from "@/lib/api/push";
import { getAccessToken } from "@/lib/auth-token";
import { cn } from "@/lib/utils";
import {
  checkPushSupport,
  createBrowserPushSubscription,
  getBrowserPushEndpoint,
  logPushError,
  removeBrowserPushSubscription,
  resolvePushDeviceSyncState,
  setLocalPushEnabled,
  type PushDeviceSyncState,
} from "@/lib/web-push";

/** Transient UI phases on top of the three sync states. */
type PushPhase =
  | "checking"
  | PushDeviceSyncState
  | "confirming"
  | "toggling_on"
  | "toggling_off";

type PushErrorCode =
  | "permission_denied"
  | "unsupported"
  | "insecure"
  | "no_vapid"
  | "subscribe_failed"
  | "unsubscribe_failed"
  | "auth"
  | null;

type ToastState = {
  kind: "ok" | "err";
  text: string;
  onRetry?: () => void;
} | null;

/**
 * Privacy Settings card: Web Push enable / disable / test with endpoint-aware sync.
 *
 * Three stable outcomes after sync:
 *   1. disabled — no account subscription
 *   2. enabled — this browser's endpoint matches the account row
 *   3. enabled_other_device — account has a sub elsewhere (or mismatched local)
 *
 * Enabling on this device calls subscribe (backend replaces any prior user row).
 */
export function PushNotificationSetting() {
  const t = useTranslations("privacy");
  const tp = useTranslations("push");
  const tipId = useId();

  const [phase, setPhase] = useState<PushPhase>("checking");
  /** Last known sync state — keeps chrome stable while enabling/disabling. */
  const [syncState, setSyncState] = useState<PushDeviceSyncState>("disabled");
  /** False until the first sync settles — avoids badge flashing "Off" on mount. */
  const [syncedOnce, setSyncedOnce] = useState(false);
  /** Where to return if the user cancels the confirm dialog. */
  const [confirmReturnPhase, setConfirmReturnPhase] =
    useState<PushDeviceSyncState>("disabled");
  /** Enable (permission) vs disable (unsubscribe) confirm copy + primary action. */
  const [confirmIntent, setConfirmIntent] = useState<"enable" | "disable">("enable");
  const [errorCode, setErrorCode] = useState<PushErrorCode>(null);
  const [toast, setToast] = useState<ToastState>(null);
  /** Soft notice when sync fails but we keep the previous UI state. */
  const [syncStaleNotice, setSyncStaleNotice] = useState(false);
  const [tipOpen, setTipOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const confirmDialogRef = useRef<HTMLDivElement | null>(null);
  /** Portal root so we can inert every other body child while confirming. */
  const confirmPortalRef = useRef<HTMLDivElement | null>(null);
  /** Element that opened the dialog — restored on Escape / Cancel. */
  const confirmTriggerRef = useRef<HTMLElement | null>(null);

  const applySyncState = useCallback((sync: PushDeviceSyncState) => {
    setSyncState(sync);
    setPhase(sync);
    setSyncedOnce(true);
  }, []);

  // Keep a ref so syncFromBackend catch can restore UI without inventing state.
  const syncStateRef = useRef(syncState);
  syncStateRef.current = syncState;
  const confirmReturnRef = useRef(confirmReturnPhase);
  confirmReturnRef.current = confirmReturnPhase;

  const clearFeedback = useCallback(() => {
    setErrorCode(null);
    setToast(null);
  }, []);

  const openConfirm = useCallback(
    (
      returnTo: PushDeviceSyncState,
      intent: "enable" | "disable",
      trigger?: HTMLElement | null,
    ) => {
      clearFeedback();
      const active = document.activeElement;
      confirmTriggerRef.current =
        trigger ??
        (active instanceof HTMLElement ? active : null);
      setConfirmReturnPhase(returnTo);
      setConfirmIntent(intent);
      setPhase("confirming");
    },
    [clearFeedback],
  );

  /** Leave confirm and put focus back on the control that opened it. */
  const closeConfirm = useCallback(() => {
    setPhase(confirmReturnRef.current);
  }, []);

  const syncFromBackend = useCallback(async () => {
    setPhase("checking");
    setErrorCode(null);
    setSyncStaleNotice(false);

    const support = checkPushSupport();
    // Hard-block only gates Enable — still fetch account sub below so Settings
    // can show Other device / Turn off when this browser cannot subscribe.
    if (!support.ok) {
      setErrorCode(support.reason);
      setLocalPushEnabled(false);
    } else if (
      typeof Notification !== "undefined" &&
      Notification.permission === "denied"
    ) {
      setErrorCode("permission_denied");
    }

    if (!getAccessToken()) {
      setLocalPushEnabled(false);
      applySyncState("disabled");
      setErrorCode("auth");
      return;
    }

    try {
      const active = await fetchActivePushSubscription();
      // Skip PushManager when this context cannot use Web Push (insecure /
      // unsupported / no VAPID). null local + account endpoint ⇒ other_device.
      const localEndpoint = support.ok ? await getBrowserPushEndpoint() : null;

      const accountEndpoint =
        active?.is_active === true ? (active.endpoint ?? null) : null;
      const sync = resolvePushDeviceSyncState(accountEndpoint, localEndpoint);

      // Local pref only when this browser is the delivery target.
      setLocalPushEnabled(sync === "enabled");
      applySyncState(sync);
      setSyncStaleNotice(false);
    } catch (err) {
      logPushError("syncFromBackend", err);
      if (err instanceof Error && err.message === "auth") {
        setErrorCode("auth");
        setLocalPushEnabled(false);
        applySyncState("disabled");
        return;
      }
      // Network / API blip — keep last successful syncState (incl. other_device).
      setPhase(syncStateRef.current);
      setSyncStaleNotice(true);
      // Settle badge so we don't spin "Checking…" forever on a failed first sync.
      setSyncedOnce(true);
    }
  }, [applySyncState]);

  useEffect(() => {
    void syncFromBackend();
  }, [syncFromBackend]);

  // Full-page inert + focus trap + Escape while confirming (portal on body).
  useLayoutEffect(() => {
    if (phase !== "confirming") return;

    const portal = confirmPortalRef.current;
    if (!portal) return;

    const inerted: HTMLElement[] = [];
    for (const child of Array.from(document.body.children)) {
      if (!(child instanceof HTMLElement) || child === portal) continue;
      if (child.hasAttribute("inert")) continue;
      child.setAttribute("inert", "");
      inerted.push(child);
    }

    const root = confirmDialogRef.current;
    const focusables = () =>
      root
        ? Array.from(
            root.querySelectorAll<HTMLElement>(
              'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
            ),
          )
        : [];

    const initial = focusables()[0];
    initial?.focus();

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeConfirm();
        return;
      }
      if (e.key !== "Tab" || !root) return;
      const nodes = focusables();
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prevOverflow;
      for (const el of inerted) el.removeAttribute("inert");
      // Restore focus after inert is cleared so the trigger is focusable again.
      const trigger = confirmTriggerRef.current;
      requestAnimationFrame(() => {
        trigger?.focus?.();
      });
    };
  }, [phase, closeConfirm]);

  const runEnable = useCallback(async () => {
    clearFeedback();
    setPhase("toggling_on");

    if (!getAccessToken()) {
      setErrorCode("auth");
      applySyncState("disabled");
      return;
    }

    const support = checkPushSupport();
    if (!support.ok) {
      setErrorCode(support.reason);
      applySyncState(confirmReturnPhase);
      return;
    }

    try {
      // Backend Subscribe deletes any prior user row + same endpoint, then inserts.
      // So "Enable on this device" cleanly replaces the other-device subscription.
      const payload = await createBrowserPushSubscription();
      await subscribePush(payload);
      setLocalPushEnabled(true);
      applySyncState("enabled");
      setToast({ kind: "ok", text: t("pushToastEnabledThisDevice") });
    } catch (err) {
      logPushError("enable", err);
      const code = err instanceof Error ? err.message : "subscribe_failed";
      if (code === "permission_denied") {
        setErrorCode("permission_denied");
      } else if (code === "unsupported" || code === "insecure" || code === "no_vapid") {
        setErrorCode(code);
      } else if (code === "auth") {
        setErrorCode("auth");
      } else {
        setErrorCode("subscribe_failed");
      }
      applySyncState(confirmReturnPhase);
      setToast({ kind: "err", text: t("pushToastEnableFailed") });
    }
  }, [applySyncState, clearFeedback, confirmReturnPhase, t]);

  const runSendTest = useCallback(async () => {
    setToast(null);
    setTesting(true);
    try {
      await sendTestPush();
      // Visible tab: SW → foreground toast with real payload — no "test sent" banner.
      // Hidden / background: OS notification; short confirmation is still useful.
      const visible =
        typeof document !== "undefined" && document.visibilityState === "visible";
      if (!visible) {
        setToast({ kind: "ok", text: tp("testSuccess") });
      }
    } catch (err) {
      logPushError("sendTest", err);
      const code = err instanceof Error ? err.message : "";
      let text = tp("testError");
      if (code === "not_found") text = tp("testErrorNoSubscription");
      else if (code === "not_configured") text = tp("testErrorNotConfigured");
      else if (code === "auth") text = t("pushErrAuth");
      setToast({
        kind: "err",
        text,
        onRetry: () => {
          void runSendTest();
        },
      });
    } finally {
      setTesting(false);
    }
  }, [t, tp]);

  const runDisable = useCallback(async () => {
    clearFeedback();
    setPhase("toggling_off");

    try {
      if (getAccessToken()) {
        await unsubscribePush();
      }
      await removeBrowserPushSubscription();
      setLocalPushEnabled(false);
      applySyncState("disabled");
      setToast({ kind: "ok", text: t("pushToastDisabled") });
    } catch (err) {
      logPushError("disable", err);
      if (err instanceof Error && err.message === "auth") {
        await removeBrowserPushSubscription();
        setLocalPushEnabled(false);
        setErrorCode("auth");
        applySyncState("disabled");
        return;
      }
      setErrorCode("unsubscribe_failed");
      await syncFromBackend();
      setToast({ kind: "err", text: t("pushToastDisableFailed") });
    }
  }, [applySyncState, clearFeedback, syncFromBackend, t]);

  const busy =
    phase === "checking" || phase === "toggling_on" || phase === "toggling_off";
  // First paint: show Checking badge, not Off. After that, badge follows last
  // settled syncState even while phase === "checking" on refresh.
  const badgePending = !syncedOnce && phase === "checking";
  // Visual state follows last sync (not transient toggling) so chrome doesn't flicker.
  const onThisDevice = !badgePending && syncState === "enabled";
  const onOtherDevice = !badgePending && syncState === "enabled_other_device";
  const accountHasPush = onThisDevice || onOtherDevice;
  // Environment cannot do Web Push at all (disable still allowed via API).
  const hardBlocked =
    errorCode === "unsupported" ||
    errorCode === "insecure" ||
    errorCode === "no_vapid";
  // Browsers will not re-prompt after deny — never open Enable/confirm loop.
  // auth: require sign-in before Turn on (avoid confusing subscribe failures).
  const enableBlocked =
    hardBlocked ||
    errorCode === "permission_denied" ||
    errorCode === "auth";

  const statusLabel = (() => {
    if (phase === "checking") return t("pushStatusChecking");
    if (phase === "toggling_on") return t("pushStatusEnabling");
    if (phase === "toggling_off") return t("pushStatusDisabling");
    if (phase === "enabled") return t("pushStatusEnabled");
    if (phase === "enabled_other_device") return t("pushStatusOtherDevice");
    if (phase === "confirming") return t("pushStatusConfirming");
    return t("pushStatusDisabled");
  })();

  const errorMessage = (() => {
    switch (errorCode) {
      case "permission_denied":
        return t("pushErrPermissionDenied");
      case "unsupported":
        return t("pushErrUnsupported");
      case "insecure":
        return t("pushErrInsecure");
      case "no_vapid":
        return t("pushErrNoVapid");
      case "subscribe_failed":
        return t("pushErrSubscribeFailed");
      case "unsubscribe_failed":
        return t("pushErrUnsubscribeFailed");
      case "auth":
        return t("pushErrAuth");
      default:
        return null;
    }
  })();

  // No Retry for permission_denied — that path reopened confirm and failed again.
  const showRetry =
    errorCode === "subscribe_failed" ||
    errorCode === "unsubscribe_failed" ||
    errorCode === "auth";

  const HeaderIcon = (() => {
    if (busy || badgePending) return Loader2;
    if (onThisDevice) return BellRing;
    if (onOtherDevice) return MonitorSmartphone;
    return BellOff;
  })();

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-xl border p-4 transition-colors duration-300 sm:p-5",
        onThisDevice
          ? "border-primary/30 bg-primary/5"
          : onOtherDevice
            ? "border-amber-500/35 bg-amber-500/5"
            : "border-border/70 bg-card",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute -right-8 -top-10 size-32 rounded-full blur-2xl transition-opacity duration-500",
          onThisDevice
            ? "bg-primary/10 opacity-100"
            : onOtherDevice
              ? "bg-amber-500/15 opacity-100"
              : "opacity-0",
        )}
      />

      <div className="relative space-y-4">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span
              aria-hidden
              className={cn(
                "inline-flex size-11 shrink-0 items-center justify-center rounded-2xl ring-1 transition-all duration-300",
                onThisDevice
                  ? "bg-primary/15 text-primary ring-primary/25"
                  : onOtherDevice
                    ? "bg-amber-500/15 text-amber-700 ring-amber-500/30 dark:text-amber-400"
                    : "bg-muted text-muted-foreground ring-border/60",
              )}
            >
              <HeaderIcon className={cn("size-5", busy ? "animate-spin" : "")} />
            </span>

            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="text-sm font-semibold tracking-tight">{t("pushRowTitle")}</h3>
                <button
                  type="button"
                  className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-expanded={tipOpen}
                  aria-controls={tipId}
                  aria-label={t("pushInfoAria")}
                  onClick={() => setTipOpen((v) => !v)}
                >
                  <Info className="size-3.5" aria-hidden />
                </button>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">{t("pushRowSub")}</p>
            </div>
          </div>

          {/* Badge: pending until first sync; then last settled syncState. */}
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-medium transition-colors duration-300",
              badgePending
                ? "bg-muted text-muted-foreground"
                : onThisDevice
                  ? "bg-primary/12 text-primary"
                  : onOtherDevice
                    ? "bg-amber-500/15 text-amber-800 dark:text-amber-300"
                    : "bg-muted text-muted-foreground",
            )}
          >
            {badgePending ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                {t("pushBadgeChecking")}
              </>
            ) : onThisDevice ? (
              <>
                <CheckCircle2 className="size-3.5" aria-hidden />
                {t("pushBadgeOnThisDevice")}
              </>
            ) : onOtherDevice ? (
              <>
                <Smartphone className="size-3.5" aria-hidden />
                {t("pushBadgeOtherDevice")}
              </>
            ) : (
              <>
                <BellOff className="size-3.5" aria-hidden />
                {t("pushBadgeOff")}
              </>
            )}
          </span>
        </div>

        <div
          id={tipId}
          hidden={!tipOpen}
          className={cn(
            "rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground transition-all duration-200",
            tipOpen ? "animate-in fade-in-0 slide-in-from-top-1" : "",
          )}
        >
          {t("pushInfoTip")}
        </div>

        <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/25 px-3 py-2.5">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
          <p className="text-xs leading-relaxed text-muted-foreground">{t("pushBenefit")}</p>
        </div>

        {/* Other-device callout */}
        {onOtherDevice ? (
          <div
            role="status"
            className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs leading-relaxed text-amber-950 dark:text-amber-100"
          >
            <MonitorSmartphone className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span>{t("pushOtherDeviceCallout")}</span>
          </div>
        ) : null}

        <p
          role="status"
          aria-live="polite"
          className="flex items-center gap-1.5 text-xs text-muted-foreground transition-opacity duration-200"
        >
          {busy ? <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden /> : null}
          <span>{statusLabel}</span>
        </p>

        {syncStaleNotice ? (
          <div
            role="status"
            className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/40 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground sm:flex-row sm:items-center"
          >
            <div className="flex min-w-0 flex-1 items-start gap-2">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1">{t("pushSyncStaleKeep")}</span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || testing}
              onClick={() => void syncFromBackend()}
              className="min-h-11 shrink-0 self-start sm:self-auto"
            >
              {t("pushRetryCta")}
            </Button>
          </div>
        ) : null}

        {errorMessage ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-xs text-destructive"
          >
            <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1 leading-relaxed">{errorMessage}</span>
          </div>
        ) : null}

        {toast ? (
          <ToastBanner
            kind={toast.kind}
            message={toast.text}
            onDismiss={() => setToast(null)}
            dismissLabel={t("dismissToast")}
            actionLabel={toast.onRetry ? t("pushRetryCta") : undefined}
            onAction={toast.onRetry}
            className="animate-in fade-in-0 slide-in-from-top-1 duration-200"
          />
        ) : null}

        {phase !== "confirming" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {/* Primary actions by sync state (use syncState so toggles don't swap CTAs). */}
              {syncState === "disabled" ? (
                <Button
                  type="button"
                  size="sm"
                  disabled={busy || enableBlocked || testing}
                  onClick={(e) => openConfirm("disabled", "enable", e.currentTarget)}
                  className="min-h-11 min-w-[8.5rem]"
                >
                  {phase === "toggling_on" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      {t("pushEnabling")}
                    </>
                  ) : (
                    <>
                      <Bell className="size-4" aria-hidden />
                      {t("pushEnableCta")}
                    </>
                  )}
                </Button>
              ) : null}

              {syncState === "enabled_other_device" ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy || enableBlocked || testing}
                    onClick={(e) =>
                      openConfirm("enabled_other_device", "enable", e.currentTarget)
                    }
                    className="min-h-11"
                  >
                    {phase === "toggling_on" ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        {t("pushEnabling")}
                      </>
                    ) : (
                      <>
                        <Smartphone className="size-4" aria-hidden />
                        {t("pushEnableThisDeviceCta")}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    // Turn off is API-only — keep available under hard-block.
                    disabled={busy || testing}
                    onClick={(e) =>
                      openConfirm("enabled_other_device", "disable", e.currentTarget)
                    }
                    className="min-h-11"
                  >
                    {phase === "toggling_off" ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        {t("pushDisabling")}
                      </>
                    ) : (
                      t("pushDisableAllDevicesCta")
                    )}
                  </Button>
                </>
              ) : null}

              {syncState === "enabled" ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busy || testing}
                  onClick={(e) => openConfirm("enabled", "disable", e.currentTarget)}
                  className="min-h-11 min-w-[8.5rem]"
                >
                  {phase === "toggling_off" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      {t("pushDisabling")}
                    </>
                  ) : (
                    t("pushDisableCta")
                  )}
                </Button>
              ) : null}

              {showRetry ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busy || testing}
                  onClick={() => {
                    clearFeedback();
                    if (errorCode === "subscribe_failed") {
                      openConfirm(
                        accountHasPush && !onThisDevice ? "enabled_other_device" : "disabled",
                        "enable",
                      );
                      return;
                    }
                    if (errorCode === "unsubscribe_failed") {
                      openConfirm(
                        onOtherDevice ? "enabled_other_device" : "enabled",
                        "disable",
                      );
                      return;
                    }
                    void syncFromBackend();
                  }}
                  className="min-h-11"
                >
                  {t("pushRetryCta")}
                </Button>
              ) : null}
            </div>

            {/* Test — only when THIS device is the delivery target */}
            <div className="space-y-2 border-t border-border/50 pt-3">
              {syncState === "enabled" ? (
                <>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={busy || testing}
                    onClick={() => void runSendTest()}
                    className="min-h-11 w-full sm:w-auto"
                  >
                    {testing ? (
                      <>
                        <Loader2 className="size-4 animate-spin" aria-hidden />
                        {tp("testButtonLoading")}
                      </>
                    ) : (
                      <>
                        <Send className="size-4" aria-hidden />
                        {tp("testButton")}
                      </>
                    )}
                  </Button>
                  <p className="text-xs leading-relaxed text-muted-foreground">{tp("testHint")}</p>
                </>
              ) : onOtherDevice ? (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {tp("testOtherDeviceHint")}
                </p>
              ) : (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {tp("testDisabledHint")}
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {phase === "confirming" && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={confirmPortalRef}
              className="fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center"
            >
              <button
                type="button"
                aria-label={t("pushConfirmCloseAria")}
                className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
                onClick={closeConfirm}
              />
              <div
                ref={confirmDialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="push-confirm-title"
                aria-describedby="push-confirm-body"
                className="relative w-full max-w-md space-y-3 rounded-2xl border border-primary/25 bg-background p-4 shadow-2xl animate-in fade-in-0 slide-in-from-bottom-4 duration-200 sm:slide-in-from-top-1"
              >
                <h2 id="push-confirm-title" className="text-sm font-semibold leading-snug">
                  {confirmIntent === "disable"
                    ? confirmReturnPhase === "enabled_other_device"
                      ? t("pushConfirmTitleDisableAll")
                      : t("pushConfirmTitleDisable")
                    : confirmReturnPhase === "enabled_other_device"
                      ? t("pushConfirmTitleSwitchDevice")
                      : t("pushConfirmTitle")}
                </h2>
                <p
                  id="push-confirm-body"
                  className="text-xs leading-relaxed text-muted-foreground"
                >
                  {confirmIntent === "disable"
                    ? confirmReturnPhase === "enabled_other_device"
                      ? t("pushConfirmBodyDisableAll")
                      : t("pushConfirmBodyDisable")
                    : confirmReturnPhase === "enabled_other_device"
                      ? t("pushConfirmBodySwitchDevice")
                      : t("pushConfirmBody")}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={confirmIntent === "disable" ? "destructive" : "default"}
                    disabled={busy}
                    onClick={() =>
                      void (confirmIntent === "disable" ? runDisable() : runEnable())
                    }
                  >
                    {confirmIntent === "disable" ? (
                      t("pushConfirmDisableContinue")
                    ) : (
                      <>
                        <Bell className="size-4" aria-hidden />
                        {t("pushConfirmContinue")}
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    onClick={closeConfirm}
                  >
                    {t("pushConfirmCancel")}
                  </Button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}
