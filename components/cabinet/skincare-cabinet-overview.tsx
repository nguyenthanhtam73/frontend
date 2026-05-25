"use client";

import { useMessages, useTranslations } from "next-intl";
import { Droplets, Sparkles } from "lucide-react";
import { useMemo } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { PrivacyControls } from "@/components/privacy/privacy-controls";
import { Link } from "@/i18n/navigation";
import { buildLocalizedStarterLines } from "@/lib/i18n/starter-pack-lines";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";

/**
 * Read a localized array from `messages.<namespace>.<key>` defensively.
 * `useTranslations` only returns strings, so for array bullets we dip into
 * the raw messages object. Fallback to `[]` if the key is missing or shaped
 * unexpectedly so the page never crashes due to bad copy.
 */
function readMessageArray(
  messages: ReturnType<typeof useMessages>,
  namespace: string,
  key: string,
): string[] {
  const ns = (messages as Record<string, unknown>)[namespace];
  if (!ns || typeof ns !== "object") return [];
  const value = (ns as Record<string, unknown>)[key];
  return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
}

export function SkincareCabinetOverview() {
  const t = useTranslations("cabinet");
  const tOnboarding = useTranslations("onboarding");
  const messages = useMessages();
  const ob = useOnboardingStore();
  const bullets = useMemo(
    () => buildLocalizedStarterLines(ob, tOnboarding),
    [ob, tOnboarding],
  );

  const demoRoutine = useMemo(
    () => readMessageArray(messages, "cabinet", "demoUsing"),
    [messages],
  );
  const demoWishlist = useMemo(
    () => readMessageArray(messages, "cabinet", "demoWishlist"),
    [messages],
  );

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          {t("sectionLabel")}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t("title")}</h1>
        <p className="max-w-2xl text-muted-foreground">{t("sub")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-6 pt-6">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="size-4 text-primary" aria-hidden />
              {t("usingTitle")}
            </div>
            <ul className="list-inside list-disc space-y-1.5 text-sm text-muted-foreground">
              {demoRoutine.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">{t("usingHint")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-6 pt-6">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Droplets className="size-4 text-primary" aria-hidden />
              {t("wishTitle")}
            </div>
            <ul className="space-y-2">
              {demoWishlist.map((x) => (
                <li
                  key={x}
                  className="rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground"
                >
                  {x}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">{t("wishHint")}</p>
          </CardContent>
        </Card>
      </div>

      {ob.completedAt ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="space-y-3 p-6">
            <p className="text-sm font-medium">{t("starterTitle")}</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground">
              {bullets.map((b) => (
                <li key={b}>• {b}</li>
              ))}
            </ul>
            <Link
              href="/onboarding"
              className="inline-block text-sm font-medium text-primary underline underline-offset-4"
            >
              {t("adjustOnboarding")}
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {t("noStarter")}{" "}
            <Link href="/onboarding" className="font-medium text-primary underline underline-offset-4">
              {t("setupLink")}
            </Link>
            .
          </CardContent>
        </Card>
      )}

      <PrivacyControls />
    </div>
  );
}
