"use client";

import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { FUNNEL_EVENTS, trackFunnelEvent, trackFunnelEventOnce } from "@/lib/analytics/funnel";
import { FIRST_PARTY_FUNNEL_EVENTS, sendFunnelEvent } from "@/lib/analytics/funnel-events";
import {
  isAndroidBetaDismissed,
  readAndroidBetaUrls,
  readDisplayMode,
  shouldShowAndroidBetaBanner,
  writeAndroidBetaDismissed,
  type AndroidBetaUrls,
} from "@/lib/android-beta-banner";
import { getAccessToken } from "@/lib/auth-token";
import { useAuthStore } from "@/lib/stores/auth-store";
import { IconDismissButton } from "@/components/ui/icon-dismiss-button";

const BETA_GROUP_URL = process.env.NEXT_PUBLIC_ANDROID_BETA_GROUP_URL;
const BETA_OPTIN_URL = process.env.NEXT_PUBLIC_ANDROID_BETA_OPTIN_URL;

type BetaTarget = "group" | "optin";

function trackBeta(kind: "view" | "click" | "dismiss", target?: BetaTarget) {
  const name =
    kind === "view"
      ? FUNNEL_EVENTS.androidBetaView
      : kind === "click"
        ? FUNNEL_EVENTS.androidBetaClick
        : FUNNEL_EVENTS.androidBetaDismiss;
  const firstParty =
    kind === "view"
      ? FIRST_PARTY_FUNNEL_EVENTS.androidBetaView
      : kind === "click"
        ? FIRST_PARTY_FUNNEL_EVENTS.androidBetaClick
        : FIRST_PARTY_FUNNEL_EVENTS.androidBetaDismiss;
  const params = target ? { target } : undefined;
  if (kind === "view") {
    if (!trackFunnelEventOnce(name, params, "android-beta-banner")) return;
  } else {
    trackFunnelEvent(name, params);
  }
  sendFunnelEvent(firstParty, params ?? {});
}

/**
 * In-flow strip under the header. It takes layout space, so it does not sit
 * on top of page buttons.
 */
export function AndroidBetaBanner() {
  const t = useTranslations("androidBeta");
  const user = useAuthStore((s) => s.user);
  const [urls, setUrls] = useState<AndroidBetaUrls | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const next = readAndroidBetaUrls({
      NEXT_PUBLIC_ANDROID_BETA_GROUP_URL: BETA_GROUP_URL,
      NEXT_PUBLIC_ANDROID_BETA_OPTIN_URL: BETA_OPTIN_URL,
    });
    const displayMode = readDisplayMode((query) => window.matchMedia(query).matches);
    const show = shouldShowAndroidBetaBanner({
      signedIn: Boolean(user || getAccessToken()),
      userAgent: navigator.userAgent,
      displayMode,
      referrer: document.referrer,
      urls: next,
      dismissed: isAndroidBetaDismissed(localStorage),
    });
    setUrls(show ? next : null);
    setVisible(show);
  }, [user]);

  useEffect(() => {
    if (!visible) return;
    trackBeta("view");
  }, [visible]);

  if (!visible || !urls) return null;

  function dismiss() {
    writeAndroidBetaDismissed(localStorage);
    trackBeta("dismiss");
    setVisible(false);
  }

  return (
    <aside
      data-testid="android-beta-banner"
      className="border-b border-primary/20 bg-primary/[0.06]"
    >
      <div className="mx-auto flex w-full max-w-5xl items-start gap-2 px-3 py-2 sm:items-center sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-foreground">{t("title")}</p>
          <div className="mt-1 flex flex-wrap gap-2">
            <a
              href={urls.group}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="android-beta-group"
              className="inline-flex min-h-10 items-center rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground"
              onClick={() => trackBeta("click", "group")}
            >
              {t("group")}
            </a>
            <a
              href={urls.optIn}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="android-beta-optin"
              className="inline-flex min-h-10 items-center rounded-full border border-primary/30 bg-background px-3 text-xs font-semibold text-foreground"
              onClick={() => trackBeta("click", "optin")}
            >
              {t("optIn")}
            </a>
          </div>
        </div>
        <IconDismissButton
          onClick={dismiss}
          ariaLabel={t("dismiss")}
          data-testid="android-beta-dismiss"
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" aria-hidden />
        </IconDismissButton>
      </div>
    </aside>
  );
}
