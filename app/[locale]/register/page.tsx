"use client";

import type { TurnstileInstance } from "@marsidev/react-turnstile";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useRouter } from "@/i18n/navigation";
import { apiBaseUrl } from "@/lib/api";
import { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-envelope";
import { setAccessToken } from "@/lib/auth-token";

const turnstileSiteKey = process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY?.trim() ?? "";
const captchaEnabled = turnstileSiteKey.length > 0;

const TurnstileWidget = dynamic(
  () => import("@marsidev/react-turnstile").then((m) => m.Turnstile),
  { ssr: false },
);

export default function RegisterPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnRef = useRef<TurnstileInstance | undefined>(undefined);

  const invalidateCaptcha = useCallback(() => {
    setTurnstileToken(null);
    turnRef.current?.reset();
  }, []);

  const onTurnstileSuccess = useCallback((token: string) => {
    setTurnstileToken(token);
    setErr(null);
  }, []);

  const submitBlocked = captchaEnabled && !turnstileToken;

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-16">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("registerTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("registerSub")}</p>
      </div>
      <Card>
        <CardContent className="space-y-4 p-6">
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setErr(null);
              if (submitBlocked) {
                setErr(t("captchaRequired"));
                return;
              }
              setLoading(true);
              try {
                const body: Record<string, unknown> = {
                  email,
                  password,
                  display_name: displayName.trim() || undefined,
                };
                if (captchaEnabled && turnstileToken) {
                  body.turnstile_token = turnstileToken;
                }
                const res = await fetch(`${apiBaseUrl}/api/v1/auth/register`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(body),
                });
                const json = (await res.json().catch(() => ({}))) as ApiEnvelope<{
                  tokens?: { access_token?: string };
                }>;
                const token = json.data?.tokens?.access_token;
                if (!res.ok || !token) {
                  invalidateCaptcha();
                  const code = json.error?.code?.trim();
                  if (code === "captcha_required") {
                    setErr(t("captchaRequired"));
                  } else if (code === "captcha_failed") {
                    setErr(t("captchaFailed"));
                  } else if (code === "captcha_unavailable") {
                    setErr(t("captchaUnavailable"));
                  } else {
                    setErr(getApiErrorMessage(json, t("errorGeneric")));
                  }
                  return;
                }
                setAccessToken(token);
                router.push("/onboarding");
              } catch {
                invalidateCaptcha();
                setErr(t("networkError"));
              } finally {
                setLoading(false);
              }
            }}
          >
            <fieldset disabled={loading} className="space-y-4 disabled:opacity-70">
              <Field label={t("email")} htmlFor="register-email">
                <input
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base outline-none ring-ring/40 focus:ring-2 sm:h-9 sm:text-sm"
                />
              </Field>
              <Field label={t("displayNameOptional")} htmlFor="register-display-name">
                <input
                  id="register-display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base outline-none ring-ring/40 focus:ring-2 sm:h-9 sm:text-sm"
                />
              </Field>
              <Field label={t("password")} htmlFor="register-password">
                <input
                  id="register-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base outline-none ring-ring/40 focus:ring-2 sm:h-9 sm:text-sm"
                />
              </Field>
              {captchaEnabled ? (
                <div className="flex flex-col items-center gap-2 pt-1">
                  <p className="text-center text-xs text-muted-foreground">{t("captchaHint")}</p>
                  <TurnstileWidget
                    ref={turnRef}
                    siteKey={turnstileSiteKey}
                    onSuccess={onTurnstileSuccess}
                    onExpire={invalidateCaptcha}
                    onError={invalidateCaptcha}
                    options={{
                      theme: "auto",
                      size: "normal",
                    }}
                  />
                </div>
              ) : null}
              {err && (
                <p role="alert" className="text-sm text-destructive">
                  {err}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading || submitBlocked}>
                {loading ? t("submitting") : t("registerCta")}
              </Button>
            </fieldset>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            {t("haveAccount")}{" "}
            <Link href="/login" className="font-medium text-primary underline underline-offset-4">
              {t("loginLink")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
