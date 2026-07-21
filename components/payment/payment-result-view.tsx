"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { fetchMePlanTierSoft, isPaidPlanTier } from "@/lib/api/payment";
import { usageQueryKey } from "@/lib/api/usage";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/lib/stores/auth-store";
import { cn } from "@/lib/utils";

export type PaymentResultKind = "success" | "error" | "cancel";

const REDIRECT_SECONDS = 3;
/** Poll /me until IPN applies plan_tier (or give up). */
const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 30_000;

type SuccessPhase = "activating" | "active" | "timeout";

type PaymentResultViewProps = {
  kind: PaymentResultKind;
};

/**
 * Shared UI for /payment/success|error|cancel.
 * Success polls /me until a paid plan appears (IPN lag), then redirects.
 */
export function PaymentResultView({ kind }: PaymentResultViewProps) {
  const t = useTranslations(`payment.${kind}`);
  const tCommon = useTranslations("payment");
  const router = useRouter();
  const queryClient = useQueryClient();
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);
  const [phase, setPhase] = useState<SuccessPhase>(
    kind === "success" ? "activating" : "active",
  );
  const [pollNonce, setPollNonce] = useState(0);
  const startedAt = useRef(Date.now());

  const applyPaidTier = useCallback(
    async (tier: string) => {
      const prev = useAuthStore.getState().user;
      if (prev) {
        useAuthStore.setState({ user: { ...prev, plan_tier: tier } });
      } else {
        await useAuthStore.getState().refresh();
      }
      await queryClient.invalidateQueries({ queryKey: usageQueryKey });
    },
    [queryClient],
  );

  // Poll until paid plan or timeout. Re-runs when pollNonce bumps (retry).
  useEffect(() => {
    if (kind !== "success" || phase !== "activating") return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    startedAt.current = Date.now();

    const tick = async () => {
      if (cancelled) return;
      const tier = await fetchMePlanTierSoft();
      if (cancelled) return;

      if (isPaidPlanTier(tier) && tier) {
        await applyPaidTier(tier);
        if (!cancelled) setPhase("active");
        return;
      }

      if (Date.now() - startedAt.current >= POLL_TIMEOUT_MS) {
        if (!cancelled) setPhase("timeout");
        return;
      }
      timer = setTimeout(() => void tick(), POLL_INTERVAL_MS);
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [kind, phase, pollNonce, applyPaidTier]);

  // Countdown redirect only after plan is confirmed active.
  useEffect(() => {
    if (kind !== "success" || phase !== "active") return;

    setSecondsLeft(REDIRECT_SECONDS);
    const tick = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    const go = window.setTimeout(() => {
      router.replace("/routine");
    }, REDIRECT_SECONDS * 1000);

    return () => {
      window.clearInterval(tick);
      window.clearTimeout(go);
    };
  }, [kind, phase, router]);

  const retryPoll = () => {
    setPhase("activating");
    setPollNonce((n) => n + 1);
  };

  const Icon = kind === "success" ? CheckCircle2 : XCircle;
  const iconTone =
    kind === "success"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
      : kind === "cancel"
        ? "bg-amber-500/15 text-amber-800 dark:text-amber-200"
        : "bg-destructive/10 text-destructive";

  const showSpinner = kind === "success" && phase === "activating";
  const title =
    kind === "success" && phase === "timeout"
      ? tCommon("pendingTitle")
      : kind === "success" && phase === "activating"
        ? tCommon("activatingTitle")
        : t("title");
  const body =
    kind === "success" && phase === "timeout"
      ? tCommon("pendingBody")
      : kind === "success" && phase === "activating"
        ? tCommon("activatingBody")
        : t("body");

  return (
    <div
      data-testid={`payment-result-${kind}`}
      data-phase={kind === "success" ? phase : kind}
      className="mx-auto flex w-full max-w-lg flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-24"
    >
      <span
        className={cn(
          "mb-5 inline-flex size-16 items-center justify-center rounded-3xl shadow-sm",
          iconTone,
        )}
        aria-hidden
      >
        {showSpinner ? (
          <Loader2 className="size-8 animate-spin" />
        ) : (
          <Icon className="size-8" strokeWidth={2.25} />
        )}
      </span>

      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        DaDiary
      </p>
      <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h1>
      <p className="mt-3 max-w-md text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
        {body}
      </p>

      {kind === "success" && phase === "active" ? (
        <p className="mt-4 text-sm font-medium text-primary/90" aria-live="polite">
          {tCommon("redirectIn", { seconds: secondsLeft })}
        </p>
      ) : null}
      {kind === "success" && phase === "activating" ? (
        <p className="mt-4 text-sm font-medium text-primary/90" aria-live="polite">
          {tCommon("refreshing")}
        </p>
      ) : null}

      <div className="mt-8 flex w-full flex-col gap-2.5 sm:max-w-xs">
        {kind === "success" && phase === "timeout" ? (
          <Button
            type="button"
            size="lg"
            className="h-12 w-full font-semibold"
            onClick={retryPoll}
          >
            {tCommon("retryActivate")}
          </Button>
        ) : null}
        {kind === "success" ? (
          <ButtonLink
            href="/routine"
            size="lg"
            variant={phase === "timeout" ? "outline" : "default"}
            className="h-12 w-full font-semibold"
          >
            {tCommon("goDashboard")}
          </ButtonLink>
        ) : (
          <ButtonLink
            href="/pricing"
            size="lg"
            className="h-12 w-full font-semibold"
          >
            {tCommon("backPricing")}
          </ButtonLink>
        )}
        <ButtonLink
          href="/feedback"
          size="lg"
          variant="outline"
          className="h-12 w-full"
        >
          {tCommon("contactSupport")}
        </ButtonLink>
      </div>
    </div>
  );
}
