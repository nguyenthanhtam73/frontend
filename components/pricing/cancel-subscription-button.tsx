"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ApiError } from "@/lib/api-client";
import { cancelSubscription } from "@/lib/api/subscription";
import { useAuthStore } from "@/lib/stores/auth-store";

type CancelSubscriptionButtonProps = {
  /** Hide when already canceled at period end. */
  cancelAtPeriodEnd?: boolean;
  className?: string;
};

/**
 * Self-serve "Hủy gói" on /pricing — confirm dialog → POST /subscription/cancel → refresh /me.
 */
export function CancelSubscriptionButton({
  cancelAtPeriodEnd = false,
  className,
}: CancelSubscriptionButtonProps) {
  const t = useTranslations("pricing.cancel");
  const { success: toastSuccess, error: toastError } = useToast();
  const refresh = useAuthStore((s) => s.refresh);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (cancelAtPeriodEnd) {
    return (
      <p
        data-testid="pricing-cancel-pending"
        className="text-center text-sm font-medium text-amber-800 dark:text-amber-200"
      >
        {t("alreadyCanceled")}
      </p>
    );
  }

  async function onConfirm() {
    setBusy(true);
    try {
      const result = await cancelSubscription();
      // Merge patch immediately, then refresh /me for a full snapshot.
      const prev = useAuthStore.getState().user;
      if (prev && result.user) {
        useAuthStore.setState({
          user: {
            ...prev,
            ...result.user,
            plan_tier: result.user.plan_tier ?? prev.plan_tier,
          },
        });
      }
      await refresh();
      toastSuccess({ title: t("successTitle"), description: t("successBody") });
      setOpen(false);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : undefined;
      if (code === "subscription_already_canceled") {
        toastSuccess({ title: t("alreadyCanceled") });
        await refresh();
        setOpen(false);
        return;
      }
      if (code === "subscription_not_active") {
        toastError({ title: t("errorTitle"), description: t("errorNotActive") });
        return;
      }
      toastError({ title: t("errorTitle"), description: t("errorGeneric") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className={className}>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          data-testid="pricing-cancel-open"
          className="text-muted-foreground underline-offset-4 hover:text-destructive hover:underline"
          onClick={() => setOpen(true)}
        >
          {t("cta")}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent data-testid="pricing-cancel-dialog">
          <DialogHeader>
            <DialogTitle>{t("confirmTitle")}</DialogTitle>
            <DialogDescription>{t("confirmBody")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              {t("confirmKeep")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={busy}
              data-testid="pricing-cancel-confirm"
              onClick={() => void onConfirm()}
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  {t("confirming")}
                </>
              ) : (
                t("confirmCancel")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
