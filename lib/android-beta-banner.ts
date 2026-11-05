/**
 * Android beta invite. Shown only to a signed-in person in a normal Android
 * browser. Hidden inside the installed app (TWA / WebView) and when either
 * invite URL is missing.
 */

export const ANDROID_BETA_DISMISS_KEY = "dadiary_android_beta_dismissed";

export type AndroidBetaUrls = {
  group: string;
  optIn: string;
};

const HTTP_URL = /^https?:\/\/\S+$/i;

export function readAndroidBetaUrls(
  env?: Record<string, string | undefined>,
): AndroidBetaUrls | null {
  // Direct `process.env.NEXT_PUBLIC_*` reads so Next inlines them in the browser.
  const source = env ?? {
    NEXT_PUBLIC_ANDROID_BETA_GROUP_URL: process.env.NEXT_PUBLIC_ANDROID_BETA_GROUP_URL,
    NEXT_PUBLIC_ANDROID_BETA_OPTIN_URL: process.env.NEXT_PUBLIC_ANDROID_BETA_OPTIN_URL,
  };
  const group = source.NEXT_PUBLIC_ANDROID_BETA_GROUP_URL?.trim() ?? "";
  const optIn = source.NEXT_PUBLIC_ANDROID_BETA_OPTIN_URL?.trim() ?? "";
  if (!HTTP_URL.test(group) || !HTTP_URL.test(optIn)) return null;
  return { group, optIn };
}

/** Chrome Custom Tab / WebView, or an explicit app token in the UA. */
export function isAndroidAppUserAgent(userAgent: string): boolean {
  return /;\s*wv[;)]/i.test(userAgent) || /DaDiaryAndroid|dadiary-android/i.test(userAgent);
}

export function isAndroidBrowser(userAgent: string): boolean {
  return /Android/i.test(userAgent) && !isAndroidAppUserAgent(userAgent);
}

/**
 * Installed shell: WebView UA, `display-mode` other than the browser tab,
 * or a Trusted Web Activity referrer (`android-app://`).
 */
export function isAndroidAppShell(input: {
  userAgent: string;
  displayMode?: string | null;
  referrer?: string | null;
}): boolean {
  if (isAndroidAppUserAgent(input.userAgent)) return true;
  const mode = (input.displayMode ?? "browser").trim().toLowerCase();
  if (mode === "standalone" || mode === "fullscreen" || mode === "minimal-ui") return true;
  const referrer = (input.referrer ?? "").trim().toLowerCase();
  return referrer.startsWith("android-app://");
}

export function isAndroidBetaDismissed(storage: Pick<Storage, "getItem"> | null): boolean {
  if (!storage) return false;
  try {
    return storage.getItem(ANDROID_BETA_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeAndroidBetaDismissed(storage: Pick<Storage, "setItem">): void {
  storage.setItem(ANDROID_BETA_DISMISS_KEY, "1");
}

export function shouldShowAndroidBetaBanner(input: {
  signedIn: boolean;
  userAgent: string;
  displayMode?: string | null;
  referrer?: string | null;
  urls: AndroidBetaUrls | null;
  dismissed: boolean;
}): boolean {
  if (!input.signedIn || input.dismissed || !input.urls) return false;
  if (!isAndroidBrowser(input.userAgent)) return false;
  return !isAndroidAppShell(input);
}

/** `matchMedia` display mode. `"browser"` when the page is a normal tab. */
export function readDisplayMode(match: (query: string) => boolean): string {
  if (match("(display-mode: standalone)")) return "standalone";
  if (match("(display-mode: fullscreen)")) return "fullscreen";
  if (match("(display-mode: minimal-ui)")) return "minimal-ui";
  return "browser";
}
