"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useRouter } from "@/i18n/navigation";
import { apiBaseUrl } from "@/lib/api";
import { getApiErrorMessage, type ApiEnvelope } from "@/lib/api-envelope";
import { setAccessToken } from "@/lib/auth-token";

export default function LoginPage() {
  const t = useTranslations("auth");
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    router.prefetch("/check-in");
  }, [router]);

  return (
    <div className="mx-auto max-w-md space-y-6 px-4 py-16">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{t("loginTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("loginSub")}</p>
      </div>
      <Card>
        <CardContent className="space-y-4 p-6">
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setErr(null);
              setLoading(true);
              try {
                const res = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email, password }),
                });
                const json = (await res.json().catch(() => ({}))) as ApiEnvelope<{
                  tokens?: { access_token?: string };
                }>;
                const token = json.data?.tokens?.access_token;
                if (!res.ok || !token) {
                  setErr(getApiErrorMessage(json, t("errorGeneric")));
                  setLoading(false);
                  return;
                }
                setAccessToken(token);
                // Keep loading until navigation replaces this screen — avoids an
                // idle login form while Next.js still loads /check-in.
                startTransition(() => {
                  router.push("/check-in");
                });
              } catch {
                setErr(t("networkError"));
                setLoading(false);
              }
            }}
          >
            {/*
              `<fieldset disabled>` disables every nested input + button while the
              request is in flight — prevents accidental double submits and
              accidental edits mid-request.
            */}
            <fieldset disabled={loading} className="space-y-4 disabled:opacity-70">
              <Field label={t("email")} htmlFor="login-email">
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base outline-none ring-ring/40 focus:ring-2 sm:h-9 sm:text-sm"
                />
              </Field>
              <Field label={t("password")} htmlFor="login-password">
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base outline-none ring-ring/40 focus:ring-2 sm:h-9 sm:text-sm"
                />
              </Field>
              {err && (
                <p role="alert" className="text-sm text-destructive">
                  {err}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("submitting") : t("loginCta")}
              </Button>
            </fieldset>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            {t("noAccount")}{" "}
            <Link href="/register" className="font-medium text-primary underline underline-offset-4">
              {t("registerLink")}
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
      <label
        htmlFor={htmlFor}
        className="text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
