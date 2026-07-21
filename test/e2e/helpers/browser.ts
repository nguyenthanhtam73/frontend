import type { Page } from "@playwright/test";

import { AUTH_TOKEN_STORAGE_KEY } from "../../../lib/auth-token";

/** Inject JWT so Next.js client treats the session as logged-in. */
export async function injectAccessToken(page: Page, token: string): Promise<void> {
  await page.addInitScript(
    ([key, value]) => {
      try {
        localStorage.setItem(key, value);
      } catch {
        /* ignore */
      }
    },
    [AUTH_TOKEN_STORAGE_KEY, token] as const,
  );
}

/**
 * Block real SePay navigation and capture the form POST payload.
 * Call BEFORE clicking upgrade CTA.
 */
export async function mockSePayFormSubmit(page: Page): Promise<{
  waitForCheckoutPost: () => Promise<{
    url: string;
    fields: Record<string, string>;
  }>;
}> {
  let resolvePost: (v: { url: string; fields: Record<string, string> }) => void;
  const posted = new Promise<{ url: string; fields: Record<string, string> }>((r) => {
    resolvePost = r;
  });

  // Abort navigation to SePay hosts; still let us inspect the request body.
  await page.route(/pay(-sandbox)?\.sepay\.vn/, async (route) => {
    const req = route.request();
    const fields: Record<string, string> = {};
    const postData = req.postData() || "";
    for (const part of postData.split("&")) {
      if (!part) continue;
      const [k, v = ""] = part.split("=");
      fields[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, " "));
    }
    resolvePost!({ url: req.url(), fields });
    await route.abort("blockedbyclient");
  });

  return {
    waitForCheckoutPost: () => posted,
  };
}
